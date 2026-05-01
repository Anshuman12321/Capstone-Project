from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from .ids import GameId


class User(BaseModel):
    """
    User account model.

    Keep this intentionally small and stable so auth/profile features can be
    layered on later without breaking core game state.
    """

    model_config = ConfigDict(frozen=True)

    user_id: UUID = Field(default_factory=uuid4)
    username: str = Field(min_length=1, max_length=32)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    game_ids: list[GameId] = Field(
        default_factory=list,
        description="Leagues this user belongs to (derived from teams rows).",
    )

