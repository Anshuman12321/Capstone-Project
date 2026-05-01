from __future__ import annotations

from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import Response

from ...models.game import Game
from ...models.user import User
from ...repos.store import STORE

router = APIRouter(prefix="/api/users", tags=["users"])


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=1, max_length=32)


@router.post("", response_model=User)
def create_user(req: CreateUserRequest) -> User:
    existing = STORE.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    return STORE.create_user(req.username)


@router.get("/by-username/{username}", response_model=User)
def get_user_by_username(username: str) -> User:
    normalized = unquote(username).strip().lower()
    user = STORE.get_user_by_username(normalized)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/games", response_model=list[Game])
def list_user_games(user_id: UUID) -> list[Game]:
    user = STORE.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return STORE.list_games_for_user(user_id)


@router.delete("/{user_id}", status_code=204)
def delete_user_account(user_id: UUID) -> Response:
    user = STORE.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    STORE.delete_user(user_id)
    return Response(status_code=204)


@router.get("/{user_id}", response_model=User)
def get_user(user_id: UUID) -> User:
    user = STORE.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

