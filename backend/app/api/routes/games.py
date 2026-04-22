from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...models.game import Game, GameSettings
from ...models.simulation import SimulationEvent, SimulationEventType
from ...services.game_service import GAME_SERVICE

router = APIRouter(prefix="/api/games", tags=["games"])


class CreateGameRequest(BaseModel):
    owner_user_id: UUID | None = None
    name: str = Field(default="My League", max_length=60)
    settings: GameSettings | None = None


class JoinGameRequest(BaseModel):
    user_id: UUID
    team_name: str | None = Field(default=None, max_length=40)


class DraftPlayerRequest(BaseModel):
    user_id: UUID
    player_id: UUID


class GameLogQuery(BaseModel):
    week_min: int | None = Field(default=None, ge=0)
    week_max: int | None = Field(default=None, ge=0)
    type: SimulationEventType | None = None


@router.post("", response_model=Game)
def create_game(req: CreateGameRequest) -> Game:
    return GAME_SERVICE.create_game(owner_user_id=req.owner_user_id, name=req.name, settings=req.settings)


@router.get("", response_model=list[Game])
def list_games() -> list[Game]:
    return GAME_SERVICE.list_games()


@router.get("/{game_id}", response_model=Game)
def get_game(game_id: UUID) -> Game:
    game = GAME_SERVICE.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.get("/{game_id}/log", response_model=list[SimulationEvent])
def get_game_log(
    game_id: UUID,
    week_min: int | None = None,
    week_max: int | None = None,
    type: SimulationEventType | None = None,
) -> list[SimulationEvent]:
    game = GAME_SERVICE.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    events = list(game.simulation_events)
    if week_min is not None:
        events = [e for e in events if e.week >= week_min]
    if week_max is not None:
        events = [e for e in events if e.week <= week_max]
    if type is not None:
        events = [e for e in events if e.type == type]
    return events


@router.post("/{game_id}/join", response_model=Game)
def join_game(game_id: UUID, req: JoinGameRequest) -> Game:
    try:
        return GAME_SERVICE.join_game(game_id=game_id, user_id=req.user_id, team_name=req.team_name)
    except KeyError:
        raise HTTPException(status_code=404, detail="Game not found")


@router.post("/{game_id}/draft/start", response_model=Game)
def start_draft(game_id: UUID) -> Game:
    try:
        return GAME_SERVICE.start_draft(game_id=game_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Game not found")


@router.post("/{game_id}/draft/pick", response_model=Game)
def draft_pick(game_id: UUID, req: DraftPlayerRequest) -> Game:
    try:
        return GAME_SERVICE.draft_player(game_id=game_id, user_id=req.user_id, player_id=req.player_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Game not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{game_id}/simulate/next-week", response_model=Game)
def simulate_next_week(game_id: UUID) -> Game:
    try:
        return GAME_SERVICE.simulate_next_week(game_id=game_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Game not found")

@router.post("/{game_id}/trade", response_model=dict)
def propose_trade(game_id: UUID) -> dict:
    """Stubbed trade proposal."""
    return {"status": "success", "message": "Trade proposed successfully! (Stub)"}

@router.post("/{game_id}/transactions", response_model=dict)
def add_drop_player(game_id: UUID) -> dict:
    """Stubbed add/drop capability."""
    return {"status": "success", "message": "Waiver transaction complete! (Stub)"}

