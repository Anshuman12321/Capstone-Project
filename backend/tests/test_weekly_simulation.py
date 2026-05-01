from __future__ import annotations

from pathlib import Path

import pytest

from backend.app.services import game_service as game_service_module
from backend.app.models.player import Player, PlayerPosition
from backend.app.models.user import User
from backend.app.repos.in_memory import STORE
from backend.app.services.game_service import GAME_SERVICE
from backend.app.services.nba_simulator import REGULAR_SEASON_WEEKS, get_nba_simulator


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@pytest.fixture(autouse=True)
def reset_store(monkeypatch):
    monkeypatch.setattr(game_service_module, "STORE", STORE)
    STORE.reset()
    yield
    STORE.reset()


def test_schedule_generation_loads_full_regular_season():
    simulator = get_nba_simulator(str(DATA_DIR))

    assert len(simulator.schedule) == 1230
    assert simulator.week_bounds(1, len(simulator.schedule), REGULAR_SEASON_WEEKS) == (0, 52)

    week = simulator.simulate_week(1, seed=7)
    assert week.week == 1
    assert week.games
    assert week.player_lines


def test_weekly_simulation_scores_drafted_rosters_and_updates_standings():
    alice = User(username="alice")
    bob = User(username="bob")
    tatum = Player(full_name="Jayson Tatum", position=PlayerPosition.sf, real_team="BOS")
    curry = Player(full_name="Stephen Curry", position=PlayerPosition.pg, real_team="GSW")
    STORE.users[alice.user_id] = alice
    STORE.users[bob.user_id] = bob
    STORE.players[tatum.player_id] = tatum
    STORE.players[curry.player_id] = curry

    game = GAME_SERVICE.create_game(alice.user_id, None, "Weekly Test")
    GAME_SERVICE.join_game(game.game_id, alice.user_id, "Alice Team")
    GAME_SERVICE.join_game(game.game_id, bob.user_id, "Bob Team")
    GAME_SERVICE.draft_player(game.game_id, alice.user_id, tatum.player_id)
    GAME_SERVICE.draft_player(game.game_id, bob.user_id, curry.player_id)

    updated = GAME_SERVICE.simulate_next_week(game.game_id)

    assert updated.current_week == 1
    assert set(updated.standings.keys()) == {alice.user_id, bob.user_id}
    assert sum(row.wins + row.losses + row.ties for row in updated.standings.values()) == 2
    assert any(event.payload.get("kind") == "fantasy_matchup" for event in updated.simulation_events)
    assert STORE.players[tatum.player_id].stats["last_week"] == 1


def test_weekly_simulation_requires_two_rostered_fantasy_teams():
    alice = User(username="alice")
    bob = User(username="bob")
    STORE.users[alice.user_id] = alice
    STORE.users[bob.user_id] = bob

    game = GAME_SERVICE.create_game(alice.user_id, None, "Empty Rosters")
    GAME_SERVICE.join_game(game.game_id, alice.user_id, "Alice Team")
    GAME_SERVICE.join_game(game.game_id, bob.user_id, "Bob Team")

    with pytest.raises(ValueError, match="At least two fantasy teams"):
        GAME_SERVICE.simulate_next_week(game.game_id)
