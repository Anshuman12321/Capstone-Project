# Capstone Project

Full-stack capstone app: a **React** (Vite + TypeScript) frontend and a **FastAPI** Python backend.

## Repository layout

| Folder       | Role |
| ------------ | ---- |
| `frontend/`  | React UI, dev server and production build |
| `backend/`   | REST API (FastAPI + Uvicorn) |

## Prerequisites

- **Node.js** (current LTS recommended) — for the frontend
- **Python 3.10+** — for the backend

## Backend

From the repository root:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API runs at `http://127.0.0.1:8000`. Interactive docs: `http://127.0.0.1:8000/docs`.

Alternatively, you can run from the repository root without `cd backend`:

```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Endpoints**

- `GET /health` — `{ "status": "ok" }`
- `GET /api/hello` — `{ "message": "Hello from FastAPI" }`
- `POST /api/games/{game_id}/simulate/next-week` — simulates one NBA schedule week, scores drafted fantasy rosters, and updates league standings.

CORS is enabled for the Vite dev origin (`http://localhost:5173`).

## Weekly simulation data

The weekly simulator reads NBA CSV inputs from `backend/data/`. To manually test it through the website:

1. Start the backend and frontend.
2. Create or join a league with at least two users.
3. Create backend players whose names and `real_team` values match the CSV data, then draft at least one player onto two different fantasy teams.
4. Open the dashboard and click **Progress Week**.
5. Confirm the dashboard week increments, then open **Standings** to see fantasy records, points for/against, streaks, recent fantasy matchups, and NBA scoring trend data.

## Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

During development, Vite proxies `/api` and `/health` to the backend on port **8000**, so the UI can call paths like `/api/hello` without extra CORS setup. Start the backend before relying on those requests.

Frontend auth persistence can be configured with `VITE_AUTH_STORAGE`:
- `session` (tab-scoped sessions, useful for development)
- `local` (shared across tabs, better for normal use)
- `auto` (default: `session` in dev, `local` in production)

**Other scripts**

- `npm run build` — production build to `frontend/dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint

## Tests

From the repository root:

```bash
python -m pytest backend/tests
cd frontend
npm run lint
npm run build
```

## Typical workflow

1. Start the backend (`uvicorn` as above).
2. Start the frontend (`npm run dev`).
3. Use the app in the browser; the home page loads `/api/hello` to confirm the stack is wired correctly.
