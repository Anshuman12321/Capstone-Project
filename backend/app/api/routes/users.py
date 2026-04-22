from __future__ import annotations

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
    with STORE._lock:
        # Check if username exists
        for existing_user in STORE.users.values():
            if existing_user.username.lower() == req.username.lower():
                return existing_user
                
        user = User(username=req.username)
        STORE.users[user.user_id] = user
        return user


@router.get("/{user_id}", response_model=User)
def get_user(user_id: UUID) -> User:
    with STORE._lock:
        user = STORE.users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

