from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...models.player import Player, PlayerPosition
from ...repos.store import STORE

router = APIRouter(prefix="/api/players", tags=["players"])


class CreatePlayerRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=80)
    position: PlayerPosition
    real_team: str | None = Field(default=None, max_length=40)


@router.post("", response_model=Player)
def create_player(req: CreatePlayerRequest) -> Player:
    return STORE.create_player(
        full_name=req.full_name,
        position=req.position,
        real_team=req.real_team,
    )


@router.get("/{player_id}", response_model=Player)
def get_player(player_id: UUID) -> Player:
    player = STORE.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("", response_model=list[Player])
def list_players() -> list[Player]:
    return STORE.list_players()

