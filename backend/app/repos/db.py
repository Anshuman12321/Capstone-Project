from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable
from uuid import UUID, uuid4

import libsql_client

from ..models.game import Game, GameSettings, GameStatus
from ..models.player import Player
from ..models.simulation import SimulationEvent, SimulationEventType
from ..models.team import Team
from ..models.user import User


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_uuid(value: Any) -> UUID:
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


def _settings_to_json(settings: GameSettings) -> str:
    return settings.model_dump_json()


def _settings_from_json(value: str | None) -> GameSettings:
    if not value:
        return GameSettings()
    return GameSettings.model_validate_json(value)


@dataclass
class DatabaseStore:
    """
    Thin persistence layer over Turso/libSQL using libsql-client.

    - no ORM
    - parameterized queries only
    - keeps FastAPI route shapes the same (routes call this store)
    """

    _client: Any | None = None

    def connect(self) -> None:
        if self._client is not None:
            return

        url = os.getenv("TURSO_DATABASE_URL")
        token = os.getenv("TURSO_AUTH_TOKEN")
        if not url:
            raise RuntimeError("Missing TURSO_DATABASE_URL env var")
        if not token:
            raise RuntimeError("Missing TURSO_AUTH_TOKEN env var")

        # Turso URLs are often provided as libsql://... which uses WebSockets.
        # Some environments/endpoints reject the WS handshake (e.g. 505). In that
        # case, fall back to HTTPS transport automatically.
        try:
            self._client = libsql_client.create_client_sync(url, auth_token=token)
            # Force a round-trip so handshake errors happen here.
            self._client.execute("SELECT 1")
        except Exception:
            if isinstance(url, str) and url.startswith("libsql://"):
                https_url = "https://" + url.removeprefix("libsql://")
                self._client = libsql_client.create_client_sync(https_url, auth_token=token)
                self._client.execute("SELECT 1")
            else:
                raise

    def close(self) -> None:
        if self._client is None:
            return
        self._client.close()
        self._client = None

    def _execute(self, sql: str, args: Iterable[Any] | None = None):
        self.connect()
        return self._client.execute(sql, list(args or []))

    def init(self) -> None:
        """
        Ensures required tables exist. Safe to call repeatedly.
        """
        # Base schema requested by the prompt (plus a few extra columns we need
        # to persist the existing Game model cleanly without rewriting routes).
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              user_id TEXT PRIMARY KEY,
              username TEXT
            )
            """
        )
        self._ensure_users_game_ids_json_column()
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS user_games (
              user_id TEXT NOT NULL,
              game_id TEXT NOT NULL,
              PRIMARY KEY (user_id, game_id)
            )
            """
        )
        self._execute(
            """
            CREATE INDEX IF NOT EXISTS idx_user_games_user_id
            ON user_games (user_id)
            """
        )
        self._execute(
            """
            CREATE INDEX IF NOT EXISTS idx_user_games_game_id
            ON user_games (game_id)
            """
        )
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS games (
              game_id TEXT PRIMARY KEY,
              owner_user_id TEXT,
              current_week INTEGER,
              name TEXT,
              status TEXT,
              settings_json TEXT,
              created_at TEXT,
              updated_at TEXT
            )
            """
        )
        self._ensure_games_user_ids_json_column()
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
              team_id TEXT PRIMARY KEY,
              game_id TEXT,
              user_id TEXT,
              team_name TEXT
            )
            """
        )
        # Ensure a user can only have one team per game (critical for reliable linking).
        self._execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_game_user
            ON teams (game_id, user_id)
            """
        )
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS players (
              player_id TEXT PRIMARY KEY,
              full_name TEXT,
              position TEXT,
              real_team TEXT,
              stats_json TEXT
            )
            """
        )
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS team_players (
              team_id TEXT,
              player_id TEXT,
              PRIMARY KEY(team_id, player_id)
            )
            """
        )
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS game_events (
              event_id TEXT PRIMARY KEY,
              game_id TEXT,
              week INTEGER,
              event_type TEXT,
              message TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self._backfill_games_user_ids_json()
        self._backfill_all_users_game_ids()

    def _ensure_users_game_ids_json_column(self) -> None:
        info = self._execute("PRAGMA table_info(users)")
        col_names = {str(row[1]) for row in info.rows}
        if "game_ids_json" not in col_names:
            self._execute("ALTER TABLE users ADD COLUMN game_ids_json TEXT")

    def _ensure_games_user_ids_json_column(self) -> None:
        info = self._execute("PRAGMA table_info(games)")
        col_names = {str(row[1]) for row in info.rows}
        if "user_ids_json" not in col_names:
            self._execute("ALTER TABLE games ADD COLUMN user_ids_json TEXT")

    def _backfill_games_user_ids_json(self) -> None:
        rs = self._execute("SELECT game_id FROM games")
        for row in rs.rows:
            self._sync_game_member_ids(_as_uuid(row[0]))

    def _list_game_ids_from_teams(self, user_id: UUID) -> list[UUID]:
        rs = self._execute(
            """
            SELECT DISTINCT t.game_id
            FROM teams t
            WHERE t.user_id = ?
            ORDER BY t.game_id ASC
            """,
            [str(user_id)],
        )
        return [_as_uuid(r[0]) for r in rs.rows]

    def _parse_game_ids_json(self, raw: str | None) -> list[UUID]:
        if not raw or not str(raw).strip():
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        if not isinstance(data, list):
            return []
        return [_as_uuid(x) for x in data]

    def _sync_user_game_membership(self, user_id: UUID) -> None:
        """
        Denormalized membership for O(1) user-row reads + indexed user_games lookups.
        Source of truth remains `teams`.
        """
        ids = self._list_game_ids_from_teams(user_id)
        id_strs = [str(gid) for gid in ids]
        self._execute(
            "UPDATE users SET game_ids_json = ? WHERE user_id = ?",
            [json.dumps(id_strs), str(user_id)],
        )
        self._execute("DELETE FROM user_games WHERE user_id = ?", [str(user_id)])
        for gid in ids:
            self._execute(
                "INSERT INTO user_games (user_id, game_id) VALUES (?, ?)",
                [str(user_id), str(gid)],
            )

    def _backfill_all_users_game_ids(self) -> None:
        rs = self._execute("SELECT user_id FROM users")
        for row in rs.rows:
            self._sync_user_game_membership(_as_uuid(row[0]))

    def _get_stored_game_ids_for_user(self, user_id: UUID) -> list[UUID]:
        rs = self._execute("SELECT game_ids_json FROM users WHERE user_id = ?", [str(user_id)])
        if not rs.rows:
            return []
        raw = rs.rows[0][0]
        if raw is None or (isinstance(raw, str) and raw.strip() == ""):
            self._sync_user_game_membership(user_id)
            rs2 = self._execute("SELECT game_ids_json FROM users WHERE user_id = ?", [str(user_id)])
            raw = rs2.rows[0][0] if rs2.rows else "[]"
        return self._parse_game_ids_json(raw)

    def _sync_game_member_ids(self, game_id: UUID) -> None:
        rs = self._execute(
            "SELECT user_id FROM teams WHERE game_id = ? ORDER BY user_id ASC",
            [str(game_id)],
        )
        ids = [str(r[0]) for r in rs.rows]
        self._execute(
            "UPDATE games SET user_ids_json = ?, updated_at = ? WHERE game_id = ?",
            [json.dumps(ids), _utc_now_iso(), str(game_id)],
        )

    # ---- users ----
    def create_user(self, username: str) -> User:
        user = User(username=username.strip())
        self._execute(
            "INSERT INTO users (user_id, username, game_ids_json) VALUES (?, ?, ?)",
            [str(user.user_id), user.username, json.dumps([])],
        )
        return User(user_id=user.user_id, username=user.username, game_ids=[])

    def get_user(self, user_id: UUID) -> User | None:
        rs = self._execute(
            "SELECT user_id, username, game_ids_json FROM users WHERE user_id = ?",
            [str(user_id)],
        )
        if not rs.rows:
            return None
        row = rs.rows[0]
        uid = _as_uuid(row[0])
        if row[2] is None or (isinstance(row[2], str) and row[2].strip() == ""):
            self._sync_user_game_membership(uid)
            rs2 = self._execute(
                "SELECT game_ids_json FROM users WHERE user_id = ?",
                [str(uid)],
            )
            gids = self._parse_game_ids_json(rs2.rows[0][0]) if rs2.rows else []
        else:
            gids = self._parse_game_ids_json(row[2])
        return User(user_id=uid, username=row[1], game_ids=gids)

    def get_user_by_username(self, username: str) -> User | None:
        normalized = username.strip().lower()
        rs = self._execute(
            """
            SELECT user_id, username, game_ids_json FROM users
            WHERE LOWER(TRIM(username)) = ? LIMIT 1
            """,
            [normalized],
        )
        if not rs.rows:
            return None
        row = rs.rows[0]
        uid = _as_uuid(row[0])
        if row[2] is None or (isinstance(row[2], str) and row[2].strip() == ""):
            self._sync_user_game_membership(uid)
            rs2 = self._execute(
                "SELECT game_ids_json FROM users WHERE user_id = ?",
                [str(uid)],
            )
            gids = self._parse_game_ids_json(rs2.rows[0][0]) if rs2.rows else []
        else:
            gids = self._parse_game_ids_json(row[2])
        return User(user_id=uid, username=row[1], game_ids=gids)

    def list_games_for_user(self, user_id: UUID) -> list[Game]:
        ids = self._get_stored_game_ids_for_user(user_id)
        if not ids:
            return []
        placeholders = ",".join(["?"] * len(ids))
        rs = self._execute(
            f"SELECT game_id FROM games WHERE game_id IN ({placeholders}) ORDER BY created_at DESC",
            [str(gid) for gid in ids],
        )
        out: list[Game] = []
        for row in rs.rows:
            g = self.get_game(_as_uuid(row[0]))
            if g:
                out.append(g)
        return out

    def delete_user(self, user_id: UUID) -> None:
        rs = self._execute("SELECT game_id FROM teams WHERE user_id = ?", [str(user_id)])
        game_ids = [_as_uuid(r[0]) for r in rs.rows]
        for gid in game_ids:
            self.leave_game(gid, user_id)

        rs_owned = self._execute("SELECT game_id FROM games WHERE owner_user_id = ?", [str(user_id)])
        for row in rs_owned.rows:
            gid = _as_uuid(row[0])
            g = self.get_game(gid)
            if not g:
                continue
            if not g.user_ids:
                self.delete_game(gid)
            else:
                self._execute(
                    "UPDATE games SET owner_user_id = ?, updated_at = ? WHERE game_id = ?",
                    [str(g.user_ids[0]), _utc_now_iso(), str(gid)],
                )

        self._execute("DELETE FROM user_games WHERE user_id = ?", [str(user_id)])
        self._execute("DELETE FROM users WHERE user_id = ?", [str(user_id)])

    # ---- players ----
    def create_player(self, full_name: str, position: str, real_team: str | None) -> Player:
        player = Player(full_name=full_name, position=position, real_team=real_team)
        self._execute(
            "INSERT INTO players (player_id, full_name, position, real_team, stats_json) VALUES (?, ?, ?, ?, ?)",
            [str(player.player_id), player.full_name, player.position, player.real_team, json.dumps(player.stats)],
        )
        return player

    def get_player(self, player_id: UUID) -> Player | None:
        rs = self._execute(
            "SELECT player_id, full_name, position, real_team, stats_json FROM players WHERE player_id = ?",
            [str(player_id)],
        )
        if not rs.rows:
            return None
        row = rs.rows[0]
        stats = json.loads(row[4] or "{}")
        return Player(
            player_id=_as_uuid(row[0]),
            full_name=row[1],
            position=row[2],
            real_team=row[3],
            stats=stats,
        )

    def list_players(self) -> list[Player]:
        rs = self._execute("SELECT player_id, full_name, position, real_team, stats_json FROM players")
        out: list[Player] = []
        for row in rs.rows:
            out.append(
                Player(
                    player_id=_as_uuid(row[0]),
                    full_name=row[1],
                    position=row[2],
                    real_team=row[3],
                    stats=json.loads(row[4] or "{}"),
                )
            )
        return out

    def update_player_stats(self, player_id: UUID, merged_stats: dict[str, Any]) -> None:
        self._execute(
            "UPDATE players SET stats_json = ? WHERE player_id = ?",
            [json.dumps(merged_stats), str(player_id)],
        )

    # ---- games ----
    def create_game(self, owner_user_id: UUID | None, settings: GameSettings, name: str) -> Game:
        game = Game(owner_user_id=owner_user_id, settings=settings, name=name)
        now = _utc_now_iso()
        self._execute(
            """
            INSERT INTO games (game_id, owner_user_id, current_week, name, status, settings_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                str(game.game_id),
                str(game.owner_user_id) if game.owner_user_id else None,
                int(game.current_week),
                game.name,
                game.status.value,
                _settings_to_json(game.settings),
                now,
                now,
            ],
        )
        if owner_user_id:
            self.join_game(game.game_id, owner_user_id, "Team 1")
        else:
            self._sync_game_member_ids(game.game_id)
        return self.get_game(game.game_id) or game

    def list_games(self) -> list[Game]:
        rs = self._execute(
            "SELECT game_id FROM games ORDER BY created_at DESC",
        )
        games: list[Game] = []
        for row in rs.rows:
            g = self.get_game(_as_uuid(row[0]))
            if g:
                games.append(g)
        return games

    def delete_game(self, game_id: UUID) -> None:
        rs_members = self._execute(
            "SELECT DISTINCT user_id FROM teams WHERE game_id = ?",
            [str(game_id)],
        )
        affected_users = [_as_uuid(r[0]) for r in rs_members.rows]
        rs = self._execute("SELECT team_id FROM teams WHERE game_id = ?", [str(game_id)])
        for row in rs.rows:
            team_id = row[0]
            self._execute("DELETE FROM team_players WHERE team_id = ?", [team_id])
        self._execute("DELETE FROM teams WHERE game_id = ?", [str(game_id)])
        self._execute("DELETE FROM game_events WHERE game_id = ?", [str(game_id)])
        self._execute("DELETE FROM games WHERE game_id = ?", [str(game_id)])
        self._execute("DELETE FROM user_games WHERE game_id = ?", [str(game_id)])
        for uid in affected_users:
            self._sync_user_game_membership(uid)

    def _get_teams_for_game(self, game_id: UUID) -> list[tuple[UUID, UUID, str]]:
        rs = self._execute(
            "SELECT team_id, user_id, team_name FROM teams WHERE game_id = ?",
            [str(game_id)],
        )
        out: list[tuple[UUID, UUID, str]] = []
        for row in rs.rows:
            out.append((_as_uuid(row[0]), _as_uuid(row[1]), row[2]))
        return out

    def _get_team_roster_player_ids(self, team_id: UUID) -> list[UUID]:
        rs = self._execute(
            "SELECT player_id FROM team_players WHERE team_id = ?",
            [str(team_id)],
        )
        return [_as_uuid(row[0]) for row in rs.rows]

    def get_game(self, game_id: UUID) -> Game | None:
        rs = self._execute(
            """
            SELECT game_id, owner_user_id, current_week, name, status, settings_json, created_at, updated_at
            FROM games
            WHERE game_id = ?
            """,
            [str(game_id)],
        )
        if not rs.rows:
            return None
        row = rs.rows[0]

        owner = _as_uuid(row[1]) if row[1] else None
        settings = _settings_from_json(row[5])
        status = GameStatus(row[4]) if row[4] else GameStatus.lobby

        teams_by_user_id: dict[UUID, Team] = {}
        user_ids: list[UUID] = []
        drafted_player_ids: set[UUID] = set()
        for team_id, user_id, team_name in self._get_teams_for_game(game_id):
            if user_id not in teams_by_user_id:
                user_ids.append(user_id)
            roster = self._get_team_roster_player_ids(team_id)
            drafted_player_ids.update(roster)
            teams_by_user_id[user_id] = Team(
                team_id=team_id,
                owner_user_id=user_id,
                name=team_name,
                roster_player_ids=roster,
            )

        events = self.get_game_log(game_id)

        return Game(
            game_id=_as_uuid(row[0]),
            owner_user_id=owner,
            current_week=int(row[2] or 0),
            name=row[3] or "Untitled League",
            status=status,
            settings=settings,
            user_ids=user_ids,
            teams_by_user_id=teams_by_user_id,
            drafted_player_ids=drafted_player_ids,
            simulation_events=events,
        )

    def join_game(self, game_id: UUID, user_id: UUID, team_name: str) -> UUID:
        existing = self._execute(
            "SELECT team_id FROM teams WHERE game_id = ? AND user_id = ? LIMIT 1",
            [str(game_id), str(user_id)],
        )
        if existing.rows:
            team_id = _as_uuid(existing.rows[0][0])
            # If caller provided a non-empty name, keep the latest.
            if team_name and team_name.strip():
                self._execute(
                    "UPDATE teams SET team_name = ? WHERE team_id = ?",
                    [team_name.strip(), str(team_id)],
                )
        else:
            team_id = uuid4()
            self._execute(
                "INSERT INTO teams (team_id, game_id, user_id, team_name) VALUES (?, ?, ?, ?)",
                [str(team_id), str(game_id), str(user_id), team_name],
            )
        self._sync_game_member_ids(game_id)
        self._sync_user_game_membership(user_id)
        return team_id

    def leave_game(self, game_id: UUID, user_id: UUID) -> None:
        rs = self._execute(
            "SELECT team_id FROM teams WHERE game_id = ? AND user_id = ?",
            [str(game_id), str(user_id)],
        )
        if not rs.rows:
            return
        team_id = rs.rows[0][0]
        rs_owner = self._execute("SELECT owner_user_id FROM games WHERE game_id = ?", [str(game_id)])
        was_owner = bool(rs_owner.rows) and str(rs_owner.rows[0][0]) == str(user_id)

        self._execute("DELETE FROM team_players WHERE team_id = ?", [team_id])
        self._execute("DELETE FROM teams WHERE team_id = ?", [team_id])

        rs_cnt = self._execute("SELECT COUNT(1) FROM teams WHERE game_id = ?", [str(game_id)])
        remaining = int(rs_cnt.rows[0][0]) if rs_cnt.rows else 0
        if remaining == 0:
            self.delete_game(game_id)
            return

        if was_owner:
            rs_new = self._execute(
                "SELECT user_id FROM teams WHERE game_id = ? ORDER BY user_id ASC LIMIT 1",
                [str(game_id)],
            )
            new_owner = rs_new.rows[0][0] if rs_new.rows else None
            self._execute(
                "UPDATE games SET owner_user_id = ?, updated_at = ? WHERE game_id = ?",
                [new_owner, _utc_now_iso(), str(game_id)],
            )
        self._sync_game_member_ids(game_id)
        self._sync_user_game_membership(user_id)

    def rename_team(self, game_id: UUID, user_id: UUID, team_name: str) -> None:
        self._execute(
            "UPDATE teams SET team_name = ? WHERE game_id = ? AND user_id = ?",
            [team_name, str(game_id), str(user_id)],
        )
        self._execute("UPDATE games SET updated_at = ? WHERE game_id = ?", [_utc_now_iso(), str(game_id)])

    def _get_team_id(self, game_id: UUID, user_id: UUID) -> UUID | None:
        rs = self._execute(
            "SELECT team_id FROM teams WHERE game_id = ? AND user_id = ? LIMIT 1",
            [str(game_id), str(user_id)],
        )
        if not rs.rows:
            return None
        return _as_uuid(rs.rows[0][0])

    def draft_player(self, game_id: UUID, user_id: UUID, player_id: UUID) -> None:
        # Prevent duplicates within a game (across all teams in that game).
        rs = self._execute(
            """
            SELECT 1
            FROM team_players tp
            JOIN teams t ON t.team_id = tp.team_id
            WHERE t.game_id = ? AND tp.player_id = ?
            LIMIT 1
            """,
            [str(game_id), str(player_id)],
        )
        if rs.rows:
            raise ValueError("Player already drafted")

        team_id = self._get_team_id(game_id, user_id)
        if not team_id:
            raise KeyError("Team not found for user")

        # Enforce roster limit via current count.
        rs2 = self._execute(
            "SELECT COUNT(1) FROM team_players WHERE team_id = ?",
            [str(team_id)],
        )
        roster_count = int(rs2.rows[0][0]) if rs2.rows else 0
        game = self.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        if roster_count >= game.settings.roster_limit:
            raise ValueError("Roster limit reached")

        self._execute(
            "INSERT INTO team_players (team_id, player_id) VALUES (?, ?)",
            [str(team_id), str(player_id)],
        )
        self._execute("UPDATE games SET updated_at = ? WHERE game_id = ?", [_utc_now_iso(), str(game_id)])

    def start_draft(self, game_id: UUID) -> None:
        self._execute(
            "UPDATE games SET status = ?, updated_at = ? WHERE game_id = ?",
            [GameStatus.drafting.value, _utc_now_iso(), str(game_id)],
        )

    def advance_week(self, game_id: UUID, emitted_events: list[SimulationEvent] | None = None) -> int:
        game = self.get_game(game_id)
        if not game:
            raise KeyError("Game not found")

        next_week = game.current_week + 1
        self._execute(
            "UPDATE games SET current_week = ?, status = ?, updated_at = ? WHERE game_id = ?",
            [
                int(next_week),
                (
                    GameStatus.in_progress.value
                    if game.status in (GameStatus.lobby, GameStatus.drafting)
                    else game.status.value
                ),
                _utc_now_iso(),
                str(game_id),
            ],
        )

        # Insert a stub event, plus any simulation engine events.
        base_event = SimulationEvent(type=SimulationEventType.note, week=next_week, payload={"message": "Advanced week"})
        all_events = [base_event, *(emitted_events or [])]
        for ev in all_events:
            msg = str(ev.payload.get("message") or "")
            self._execute(
                """
                INSERT INTO game_events (event_id, game_id, week, event_type, message)
                VALUES (?, ?, ?, ?, ?)
                """,
                [str(ev.event_id), str(game_id), int(ev.week), ev.type.value, msg],
            )

        return next_week

    def get_game_log(self, game_id: UUID) -> list[SimulationEvent]:
        rs = self._execute(
            """
            SELECT event_id, week, event_type, message, created_at
            FROM game_events
            WHERE game_id = ?
            ORDER BY week ASC, created_at ASC
            """,
            [str(game_id)],
        )
        out: list[SimulationEvent] = []
        for row in rs.rows:
            created = row[4]
            # created_at may come back as "YYYY-MM-DD HH:MM:SS" or ISO; keep it robust.
            try:
                created_dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            except ValueError:
                created_dt = datetime.now(timezone.utc)
            out.append(
                SimulationEvent(
                    event_id=_as_uuid(row[0]),
                    week=int(row[1]),
                    type=SimulationEventType(str(row[2])),
                    created_at=created_dt if created_dt.tzinfo else created_dt.replace(tzinfo=timezone.utc),
                    payload={"message": row[3] or ""},
                )
            )
        return out

