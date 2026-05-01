from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    # When run from repo root: `uvicorn backend.main:app`
    from backend.app.api.routes.games import router as games_router
    from backend.app.api.routes.players import router as players_router
    from backend.app.api.routes.users import router as users_router
    from backend.app.repos.store import STORE
except ModuleNotFoundError as e:
    # Only fall back when the *package* can't be found (running from backend/).
    # If an inner import fails (e.g. missing dependency), surface the real error.
    if getattr(e, "name", None) != "backend":
        raise
    # When run from backend/ directory: `uvicorn main:app`
    from app.api.routes.games import router as games_router
    from app.api.routes.players import router as players_router
    from app.api.routes.users import router as users_router
    from app.repos.store import STORE

app = FastAPI(title="Capstone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://jdwil.github.io",
        "http://www.bananaball.run.place",
        "https://www.bananaball.run.place",
    ],
    allow_origin_regex=r"https://.*\.github\.io|https?://(www\.)?bananaball\.run\.place",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI"}


@app.on_event("startup")
def _init_db() -> None:
    STORE.init()


app.include_router(users_router)
app.include_router(players_router)
app.include_router(games_router)
