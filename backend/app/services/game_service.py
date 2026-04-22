from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from ..models.game import Game, GameSettings, GameStatus
from ..models.ids import GameId, PlayerId, UserId
from ..models.team import Team
from ..repos.in_memory import STORE
from .simulation_engine import SIM_ENGINE


class GameService:
    """
    High-level game operations.

    Today: in-memory only + stubbed operations.
    Future: add persistence + real simulation + multiplayer synchronization.
    """

    def create_game(self, owner_user_id: UserId | None, name: str, settings: GameSettings | None) -> Game:
        game = Game(owner_user_id=owner_user_id, name=name, settings=settings or GameSettings())
        with STORE._lock:
            STORE.games[game.game_id] = game
            if owner_user_id and owner_user_id in STORE.users:
                user = STORE.users[owner_user_id]
                STORE.users[owner_user_id] = user.model_copy(update={"game_ids": [*user.game_ids, game.game_id]})
        return game

    def list_games(self) -> list[Game]:
        with STORE._lock:
            return list(STORE.games.values())

    def get_game(self, game_id: GameId) -> Game | None:
        with STORE._lock:
            return STORE.games.get(game_id)

    def save_game(self, game: Game) -> Game:
        with STORE._lock:
            STORE.games[game.game_id] = game
        return game

    # ---- membership / lobby ----
    def join_game(self, game_id: GameId, user_id: UserId, team_name: str | None = None) -> Game:
        with STORE._lock:
            game = STORE.games[game_id]
            if user_id not in game.user_ids:
                user_ids = [*game.user_ids, user_id]
            else:
                user_ids = list(game.user_ids)

            teams_by_user_id = dict(game.teams_by_user_id)
            if user_id not in teams_by_user_id:
                teams_by_user_id[user_id] = Team(
                    owner_user_id=user_id,
                    name=team_name or f"Team {len(teams_by_user_id) + 1}",
                )

            next_game = game.model_copy(
                update={
                    "user_ids": user_ids,
                    "teams_by_user_id": teams_by_user_id,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            STORE.games[game_id] = next_game
            
            if user_id in STORE.users:
                user = STORE.users[user_id]
                if game_id not in user.game_ids:
                    STORE.users[user_id] = user.model_copy(update={"game_ids": [*user.game_ids, game_id]})
            return next_game

    def start_draft(self, game_id: GameId) -> Game:
        with STORE._lock:
            game = STORE.games[game_id]
            next_game = game.model_copy(
                update={"status": GameStatus.drafting, "updated_at": datetime.now(timezone.utc)}
            )
            STORE.games[game_id] = next_game
            return next_game

    # ---- draft ----
    def draft_player(self, game_id: GameId, user_id: UserId, player_id: PlayerId) -> Game:
        """
        Stubbed: enforces no duplicates + roster limit.
        """
        with STORE._lock:
            game = STORE.games[game_id]
            team = game.teams_by_user_id[user_id]

            if player_id in game.drafted_player_ids:
                raise ValueError("Player already drafted")
            if len(team.roster_player_ids) >= game.settings.roster_limit:
                raise ValueError("Roster limit reached")

            drafted_player_ids = set(game.drafted_player_ids)
            drafted_player_ids.add(player_id)

            teams_by_user_id = dict(game.teams_by_user_id)
            teams_by_user_id[user_id] = team.model_copy(
                update={"roster_player_ids": [*team.roster_player_ids, player_id]}
            )

            next_game = game.model_copy(
                update={
                    "drafted_player_ids": drafted_player_ids,
                    "teams_by_user_id": teams_by_user_id,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            STORE.games[game_id] = next_game
            return next_game

    # ---- simulation / scoring ----
    def simulate_next_week(self, game_id: GameId) -> Game:
        """
        Advances time by one "week" via the simulation engine.

        Today: stub engine appends a note event + increments week.
        Future: AI/rules engine can emit events, update stats, and drive outcomes.
        """
        with STORE._lock:
            game = STORE.games[game_id]
            sim_result = SIM_ENGINE.step_week(game)

            # Apply stat updates (if any) to the player pool.
            if sim_result.updated_player_stats:
                for pid, stat_patch in sim_result.updated_player_stats.items():
                    player = STORE.players.get(pid)
                    if not player:
                        continue
                    merged = dict(player.stats)
                    merged.update(stat_patch)
                    STORE.players[pid] = player.model_copy(update={"stats": merged})

            simulation_events = [*game.simulation_events, *sim_result.events]
            next_game = game.model_copy(
                update={
                    "status": GameStatus.in_progress
                    if game.status in (GameStatus.lobby, GameStatus.drafting)
                    else game.status,
                    "current_week": sim_result.week,
                    "simulation_events": simulation_events,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            STORE.games[game_id] = next_game
            return next_game


GAME_SERVICE = GameService()

