from __future__ import annotations

from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...models.user import User
from ...repos.in_memory import STORE

router = APIRouter(prefix="/api/users", tags=["users"])


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=1, max_length=32)


@router.post("", response_model=User)
def create_user(req: CreateUserRequest) -> User:
    normalized = req.username.strip().lower()
    with STORE._lock:
        existing = next(
            (candidate for candidate in STORE.users.values() if candidate.username.strip().lower() == normalized),
            None,
        )
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
    user = User(username=req.username.strip())
    with STORE._lock:
        STORE.users[user.user_id] = user
    return user


@router.get("/by-username/{username}", response_model=User)
def get_user_by_username(username: str) -> User:
    normalized = unquote(username).strip().lower()
    with STORE._lock:
        user = next(
            (candidate for candidate in STORE.users.values() if candidate.username.strip().lower() == normalized),
            None,
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}", response_model=User)
def get_user(user_id: UUID) -> User:
    with STORE._lock:
        user = STORE.users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

