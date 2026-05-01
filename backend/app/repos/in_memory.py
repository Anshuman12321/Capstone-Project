from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from uuid import UUID

from ..models.game import Game, GameSettings, GameStatus
from ..models.player import Player
from ..models.simulation import SimulationEvent, SimulationEventType
from ..models.team import Team
from ..models.user import User


@dataclass
class InMemoryStore:
    """
    Minimal in-memory store suitable for local dev.

    Intentionally centralized so swapping to a DB later is straightforward.
    """

    _lock: Lock = field(default_factory=Lock)
    games: dict[UUID, Game] = field(default_factory=dict)
    users: dict[UUID, User] = field(default_factory=dict)
    players: dict[UUID, Player] = field(default_factory=dict)

    def reset(self) -> None:
        with self._lock:
            self.games.clear()
            self.users.clear()
            self.players.clear()

    def create_game(self, owner_user_id: UUID | None, settings: GameSettings, name: str) -> Game:
        game = Game(owner_user_id=owner_user_id, settings=settings, name=name)
        with self._lock:
            self.games[game.game_id] = game
        return game

    def list_games(self) -> list[Game]:
        with self._lock:
            return sorted(self.games.values(), key=lambda game: game.created_at, reverse=True)

    def get_game(self, game_id: UUID) -> Game | None:
        with self._lock:
            return self.games.get(game_id)

    def save_game(self, game: Game) -> Game:
        next_game = game.model_copy(update={"updated_at": datetime.now(timezone.utc)})
        with self._lock:
            self.games[next_game.game_id] = next_game
        return next_game

    def delete_game(self, game_id: UUID) -> None:
        with self._lock:
            self.games.pop(game_id, None)

    def join_game(self, game_id: UUID, user_id: UUID, team_name: str) -> UUID:
        with self._lock:
            game = self.games.get(game_id)
            if not game:
                raise KeyError("Game not found")

            existing_team = game.teams_by_user_id.get(user_id)
            if existing_team:
                team = existing_team.model_copy(update={"name": team_name})
            else:
                team = Team(owner_user_id=user_id, name=team_name)

            user_ids = list(game.user_ids)
            if user_id not in user_ids:
                user_ids.append(user_id)

            teams_by_user_id = dict(game.teams_by_user_id)
            teams_by_user_id[user_id] = team
            self.games[game_id] = game.model_copy(
                update={
                    "user_ids": user_ids,
                    "teams_by_user_id": teams_by_user_id,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            return team.team_id

    def leave_game(self, game_id: UUID, user_id: UUID) -> None:
        with self._lock:
            game = self.games.get(game_id)
            if not game:
                return

            teams_by_user_id = dict(game.teams_by_user_id)
            departed = teams_by_user_id.pop(user_id, None)
            drafted_player_ids = set(game.drafted_player_ids)
            if departed:
                for player_id in departed.roster_player_ids:
                    drafted_player_ids.discard(player_id)

            self.games[game_id] = game.model_copy(
                update={
                    "user_ids": [uid for uid in game.user_ids if uid != user_id],
                    "teams_by_user_id": teams_by_user_id,
                    "drafted_player_ids": drafted_player_ids,
                    "updated_at": datetime.now(timezone.utc),
                }
            )

    def rename_team(self, game_id: UUID, user_id: UUID, team_name: str) -> None:
        with self._lock:
            game = self.games.get(game_id)
            if not game:
                return
            team = game.teams_by_user_id.get(user_id)
            if not team:
                return

            teams_by_user_id = dict(game.teams_by_user_id)
            teams_by_user_id[user_id] = team.model_copy(update={"name": team_name})
            self.games[game_id] = game.model_copy(
                update={"teams_by_user_id": teams_by_user_id, "updated_at": datetime.now(timezone.utc)}
            )

    def draft_player(self, game_id: UUID, user_id: UUID, player_id: UUID) -> None:
        with self._lock:
            game = self.games.get(game_id)
            if not game:
                raise KeyError("Game not found")
            if player_id in game.drafted_player_ids:
                raise ValueError("Player already drafted")

            team = game.teams_by_user_id.get(user_id)
            if not team:
                raise KeyError("Team not found for user")
            if len(team.roster_player_ids) >= game.settings.roster_limit:
                raise ValueError("Roster limit reached")

            roster_player_ids = [*team.roster_player_ids, player_id]
            teams_by_user_id = dict(game.teams_by_user_id)
            teams_by_user_id[user_id] = team.model_copy(update={"roster_player_ids": roster_player_ids})
            drafted_player_ids = set(game.drafted_player_ids)
            drafted_player_ids.add(player_id)
            self.games[game_id] = game.model_copy(
                update={
                    "teams_by_user_id": teams_by_user_id,
                    "drafted_player_ids": drafted_player_ids,
                    "updated_at": datetime.now(timezone.utc),
                }
            )

    def start_draft(self, game_id: UUID) -> None:
        with self._lock:
            game = self.games.get(game_id)
            if game:
                self.games[game_id] = game.model_copy(
                    update={"status": GameStatus.drafting, "updated_at": datetime.now(timezone.utc)}
                )

    def get_player(self, player_id: UUID) -> Player | None:
        with self._lock:
            return self.players.get(player_id)

    def update_player_stats(self, player_id: UUID, merged_stats: dict[str, str | int | float]) -> None:
        with self._lock:
            player = self.players.get(player_id)
            if player:
                self.players[player_id] = player.model_copy(update={"stats": merged_stats})

    def advance_week(self, game_id: UUID, emitted_events: list[SimulationEvent] | None = None) -> int:
        with self._lock:
            game = self.games.get(game_id)
            if not game:
                raise KeyError("Game not found")
            next_week = game.current_week + 1
            events = [
                *game.simulation_events,
                SimulationEvent(type=SimulationEventType.note, week=next_week, payload={"message": "Advanced week"}),
                *(emitted_events or []),
            ]
            self.games[game_id] = game.model_copy(
                update={
                    "current_week": next_week,
                    "status": GameStatus.in_progress
                    if game.status in (GameStatus.lobby, GameStatus.drafting)
                    else game.status,
                    "simulation_events": events,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            return next_week


STORE = InMemoryStore()

