from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """
    User account model.

    Keep this intentionally small and stable so auth/profile features can be
    layered on later without breaking core game state.
    """

    model_config = ConfigDict(frozen=True)

    user_id: UUID = Field(default_factory=uuid4)
    username: str = Field(min_length=1, max_length=32)
    game_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

