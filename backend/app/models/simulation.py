from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from .ids import PlayerId, TeamId, UserId


class SimulationEventType(str, Enum):
    injury = "injury"
    game_outcome = "game_outcome"
    role_change = "role_change"
    note = "note"


class SimulationEvent(BaseModel):
    """
    Small, append-only facts emitted by a simulation step.

    Keep events flexible and schema-light so an AI/sim can iterate without
    constant backend refactors.
    """

    model_config = ConfigDict(frozen=True)

    event_id: UUID = Field(default_factory=uuid4)
    type: SimulationEventType
    week: int = Field(ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    player_id: PlayerId | None = None
    team_id: TeamId | None = None
    payload: dict[str, str | int | float | bool] = Field(default_factory=dict)


class FantasyStanding(BaseModel):
    model_config = ConfigDict(frozen=True)

    wins: int = Field(default=0, ge=0)
    losses: int = Field(default=0, ge=0)
    ties: int = Field(default=0, ge=0)
    points_for: float = Field(default=0.0, ge=0)
    points_against: float = Field(default=0.0, ge=0)
    streak: str = ""


class SimulationStepResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    week: int = Field(ge=0)
    events: list[SimulationEvent] = Field(default_factory=list)
    updated_player_stats: dict[PlayerId, dict[str, str | int | float]] = Field(default_factory=dict)
    updated_standings: dict[UserId, FantasyStanding] = Field(default_factory=dict)

