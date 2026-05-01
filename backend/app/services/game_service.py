from __future__ import annotations

from datetime import datetime, timezone

from ..models.game import Game, GameSettings, GameStatus
from ..models.ids import GameId, PlayerId, UserId
from ..models.team import Team
from ..repos.store import STORE
from .simulation_engine import SIM_ENGINE


class GameService:
    """
    High-level game operations.

    Today: in-memory only + stubbed operations.
    Future: add persistence + real simulation + multiplayer synchronization.
    """

    def create_game(
        self, owner_user_id: UserId | None, settings: GameSettings | None, name: str | None = None
    ) -> Game:
        normalized_name = (name or "").strip() or "Untitled League"
        return STORE.create_game(owner_user_id=owner_user_id, settings=settings or GameSettings(), name=normalized_name)

    def list_games(self) -> list[Game]:
        return STORE.list_games()

    def get_game(self, game_id: GameId) -> Game | None:
        return STORE.get_game(game_id)

    def save_game(self, game: Game) -> Game:
        # Not used by routes today; keep compatibility for future use.
        # Re-fetch from DB after operations for authoritative state.
        return STORE.get_game(game.game_id) or game

    # ---- membership / lobby ----
    def _remove_user_from_game(self, game: Game, user_id: UserId) -> Game:
        user_ids = [uid for uid in game.user_ids if uid != user_id]
        teams_by_user_id = dict(game.teams_by_user_id)
        departed_team = teams_by_user_id.pop(user_id, None)

        drafted_player_ids = set(game.drafted_player_ids)
        if departed_team:
            for player_id in departed_team.roster_player_ids:
                drafted_player_ids.discard(player_id)

        standings = dict(game.standings)
        standings.pop(user_id, None)

        owner_user_id = game.owner_user_id
        if owner_user_id == user_id:
            owner_user_id = user_ids[0] if user_ids else None

        return game.model_copy(
            update={
                "owner_user_id": owner_user_id,
                "user_ids": user_ids,
                "teams_by_user_id": teams_by_user_id,
                "drafted_player_ids": drafted_player_ids,
                "standings": standings,
                "updated_at": datetime.now(timezone.utc),
            }
        )

    def join_game(self, game_id: GameId, user_id: UserId, team_name: str | None = None) -> Game:
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")

        existing_team = game.teams_by_user_id.get(user_id)
        if existing_team:
            if team_name and team_name.strip() and team_name.strip() != existing_team.name:
                STORE.rename_team(game_id, user_id, team_name.strip())
            return STORE.get_game(game_id) or game

        STORE.join_game(
            game_id=game_id,
            user_id=user_id,
            team_name=(team_name or "").strip() or f"Team {len(game.teams_by_user_id) + 1}",
        )
        return STORE.get_game(game_id) or game

    def leave_game(self, game_id: GameId, user_id: UserId) -> Game:
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        STORE.leave_game(game_id, user_id)
        next_game = STORE.get_game(game_id)
        if not next_game:
            raise KeyError("Game not found")
        return next_game

    def kick_user(self, game_id: GameId, owner_user_id: UserId, target_user_id: UserId) -> Game:
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        if game.owner_user_id != owner_user_id:
            raise PermissionError("Only the league owner can manage players")
        if target_user_id == owner_user_id:
            raise PermissionError("Owner cannot kick themselves")
        STORE.leave_game(game_id, target_user_id)
        next_game = STORE.get_game(game_id)
        if not next_game:
            raise KeyError("Game not found")
        return next_game

    def delete_game(self, game_id: GameId, user_id: UserId) -> None:
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        if game.owner_user_id != user_id:
            raise PermissionError("Only the league owner can delete this game")
        STORE.delete_game(game_id)

    def start_draft(self, game_id: GameId) -> Game:
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        STORE.start_draft(game_id)
        return STORE.get_game(game_id) or game.model_copy(
            update={"status": GameStatus.drafting, "updated_at": datetime.now(timezone.utc)}
        )

    # ---- draft ----
    def draft_player(self, game_id: GameId, user_id: UserId, player_id: PlayerId) -> Game:
        """
        Stubbed: enforces no duplicates + roster limit.
        """
        STORE.draft_player(game_id=game_id, user_id=user_id, player_id=player_id)
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        return game

    # ---- simulation / scoring ----
    def simulate_next_week(self, game_id: GameId) -> Game:
        """
        Advances time by one "week" via the simulation engine.

        Today: stub engine appends a note event + increments week.
        Future: AI/rules engine can emit events, update stats, and drive outcomes.
        """
        game = STORE.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        sim_result = SIM_ENGINE.step_week(game)

        if sim_result.updated_player_stats:
            for pid, stat_patch in sim_result.updated_player_stats.items():
                player = STORE.get_player(pid)
                if not player:
                    continue
                merged = dict(player.stats)
                merged.update(stat_patch)
                STORE.update_player_stats(pid, merged)

        # Combine both simulation logic and remote db (STORE) update for next week.
        simulation_events = [*game.simulation_events, *sim_result.events]
        standings = dict(game.standings)
        standings.update(sim_result.updated_standings)
        next_game = game.model_copy(
            update={
                "status": GameStatus.in_progress
                if game.status in (GameStatus.lobby, GameStatus.drafting)
                else game.status,
                "current_week": sim_result.week,
                "standings": standings,
                "simulation_events": simulation_events,
                "updated_at": datetime.now(timezone.utc),
            }
        )
        if hasattr(STORE, "save_game"):
            return STORE.save_game(next_game)

        # Save next_game using remote db approach
        STORE.advance_week(game_id, emitted_events=sim_result.events)
        # After advancing in remote db, refetch the latest version to ensure source of truth
        remote_next_game = STORE.get_game(game_id)
        if not remote_next_game:
            # Fallback to locally simulated version if remote db fails somehow
            return next_game
        return remote_next_game


GAME_SERVICE = GameService()

