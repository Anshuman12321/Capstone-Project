from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from .ids import GameId, PlayerId, UserId
from .simulation import SimulationEvent
from .team import Team
from .transaction import Transaction


class GameStatus(str, Enum):
    lobby = "lobby"
    drafting = "drafting"
    in_progress = "in_progress"
    completed = "completed"


class GameSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    max_teams: int = Field(default=8, ge=2, le=32)
    roster_limit: int = Field(default=15, ge=1, le=40)
    random_seed: int | None = None


class Game(BaseModel):
    """
    Core game state container.

    Key design goal: a single `Game` instance should contain all state required to
    resume play, and be uniquely referenceable by `game_id` for online/multi-game.
    """

    model_config = ConfigDict(frozen=True)

    game_id: GameId = Field(default_factory=uuid4)
    name: str = Field(default="My League", max_length=60)
    status: GameStatus = GameStatus.lobby
    settings: GameSettings = Field(default_factory=GameSettings)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Membership / ownership
    owner_user_id: UserId | None = None
    user_ids: list[UserId] = Field(default_factory=list)

    # Draft / roster state
    teams_by_user_id: dict[UserId, Team] = Field(default_factory=dict)
    drafted_player_ids: set[PlayerId] = Field(default_factory=set)

    # Season-ish progression
    current_week: int = Field(default=0, ge=0)
    standings: dict[UserId, int] = Field(default_factory=dict)  # wins for now

    # Simulation / AI progression log (append-only)
    simulation_events: list[SimulationEvent] = Field(default_factory=list)

    # Transactions (trades/waivers/acquisitions)
    transactions: list[Transaction] = Field(default_factory=list)

