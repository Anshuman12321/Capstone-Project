from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from ..models.game import Game
from ..models.ids import UserId
from ..models.simulation import FantasyStanding, SimulationEvent, SimulationEventType, SimulationStepResult
from ..repos.in_memory import STORE
from .nba_simulator import REGULAR_SEASON_WEEKS, get_nba_simulator, player_stat_key


class SimulationEngine(Protocol):
    """
    Pluggable simulation interface.

    Later implementations can be:
    - deterministic rules-based engine
    - AI agent that emits events + stat updates
    - hybrid
    """

    def step_week(self, game: Game) -> SimulationStepResult: ...


FANTASY_SCORING_WEIGHTS = {
    "pts": 1.0,
    "reb": 1.2,
    "ast": 1.5,
    "stl": 3.0,
    "blk": 3.0,
    "tov": -1.0,
    "x3pm": 0.5,
}


@dataclass(frozen=True)
class StubSimulationEngine:
    """
    Safe placeholder that does not change competitive outcomes.
    """

    def step_week(self, game: Game) -> SimulationStepResult:
        next_week = game.current_week + 1
        return SimulationStepResult(
            week=next_week,
            events=[
                SimulationEvent(
                    type=SimulationEventType.note,
                    week=next_week,
                    payload={"message": "Stub simulation step (no-op)"},
                )
            ],
            updated_player_stats={},
        )


@dataclass(frozen=True)
class WeeklyNBASimulationEngine:
    """
    Simulates one NBA schedule slice, scores fantasy rosters, and emits weekly outcomes.
    """

    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    regular_season_weeks: int = REGULAR_SEASON_WEEKS

    def step_week(self, game: Game) -> SimulationStepResult:
        next_week = game.current_week + 1
        if next_week > self.regular_season_weeks:
            raise ValueError(f"The simulated regular season is complete after week {self.regular_season_weeks}")

        fantasy_teams = [(user_id, team) for user_id, team in game.teams_by_user_id.items() if team.roster_player_ids]
        if len(fantasy_teams) < 2:
            raise ValueError("At least two fantasy teams with drafted rosters are required to progress the week")

        simulator = get_nba_simulator(str(self.data_dir))
        nba_week = simulator.simulate_week(next_week, seed=game.settings.random_seed)
        line_by_name = {player_stat_key(line.name): line for line in nba_week.player_lines.values()}

        weekly_scores: dict[UserId, float] = {}
        updated_player_stats = {}
        events: list[SimulationEvent] = []
        unmatched_players: list[str] = []

        for user_id, team in fantasy_teams:
            score = 0.0
            for player_id in team.roster_player_ids:
                player = STORE.players.get(player_id)
                if not player:
                    continue

                line = nba_week.player_lines.get(player_stat_key(player.full_name, player.real_team))
                if line is None:
                    line = line_by_name.get(player_stat_key(player.full_name))
                if line is None:
                    unmatched_players.append(player.full_name)
                    updated_player_stats[player_id] = {"last_week": next_week, "last_week_fantasy_points": 0.0}
                    continue

                fantasy_points = self._fantasy_points(line.stats)
                score += fantasy_points
                updated_player_stats[player_id] = self._player_stat_patch(player.stats, next_week, line.stats, fantasy_points)

            weekly_scores[user_id] = round(score, 2)

        events.extend(self._nba_events(next_week, nba_week.games))
        matchup_events, updated_standings = self._score_matchups(game, weekly_scores, next_week)
        events.extend(matchup_events)

        if unmatched_players:
            events.append(
                SimulationEvent(
                    type=SimulationEventType.note,
                    week=next_week,
                    payload={
                        "kind": "unmatched_players",
                        "count": len(unmatched_players),
                        "message": f"{len(unmatched_players)} drafted players did not match the NBA CSV data",
                    },
                )
            )

        return SimulationStepResult(
            week=next_week,
            events=events,
            updated_player_stats=updated_player_stats,
            updated_standings=updated_standings,
        )

    @staticmethod
    def _fantasy_points(stats: dict[str, float | int]) -> float:
        total = 0.0
        for stat, weight in FANTASY_SCORING_WEIGHTS.items():
            total += float(stats.get(stat, 0)) * weight
        return round(total, 2)

    @staticmethod
    def _player_stat_patch(
        current_stats: dict[str, str | int | float], week: int, line_stats: dict[str, float | int], fantasy_points: float
    ) -> dict[str, str | int | float]:
        patch: dict[str, str | int | float] = {
            "last_week": week,
            "last_week_fantasy_points": fantasy_points,
        }
        for stat in ["g", "mp", "pts", "reb", "ast", "stl", "blk", "tov", "x3pm", "fga", "fgm", "fta", "ftm"]:
            value = float(line_stats.get(stat, 0))
            patch[f"last_week_{stat}"] = round(value, 1) if stat == "mp" else int(value)
            existing_value = current_stats.get(f"season_{stat}", 0)
            existing = float(existing_value) if isinstance(existing_value, (int, float)) else 0.0
            next_value = existing + value
            patch[f"season_{stat}"] = round(next_value, 1) if stat == "mp" else int(next_value)

        existing_fantasy = current_stats.get("season_fantasy_points", 0)
        season_fantasy = float(existing_fantasy) if isinstance(existing_fantasy, (int, float)) else 0.0
        patch["season_fantasy_points"] = round(season_fantasy + fantasy_points, 2)
        return patch

    @staticmethod
    def _nba_events(week: int, games) -> list[SimulationEvent]:
        return [
            SimulationEvent(
                type=SimulationEventType.game_outcome,
                week=week,
                payload={
                    "kind": "nba_game",
                    "home": game.home,
                    "away": game.away,
                    "home_points": game.home_points,
                    "away_points": game.away_points,
                },
            )
            for game in games
        ]

    def _score_matchups(
        self, game: Game, weekly_scores: dict[UserId, float], week: int
    ) -> tuple[list[SimulationEvent], dict[UserId, FantasyStanding]]:
        ordered_user_ids = sorted(weekly_scores.keys(), key=str)
        if len(ordered_user_ids) > 2:
            fixed_user_id = ordered_user_ids[0]
            rotating_user_ids = ordered_user_ids[1:]
            shift = (week - 1) % len(rotating_user_ids)
            ordered_user_ids = [fixed_user_id, *rotating_user_ids[shift:], *rotating_user_ids[:shift]]
        if len(ordered_user_ids) % 2 == 1:
            ordered_user_ids = ordered_user_ids[:-1]

        events: list[SimulationEvent] = []
        updated_standings = {user_id: game.standings.get(user_id, FantasyStanding()) for user_id in weekly_scores}
        for index in range(0, len(ordered_user_ids), 2):
            home_user_id = ordered_user_ids[index]
            away_user_id = ordered_user_ids[index + 1]
            home_score = weekly_scores[home_user_id]
            away_score = weekly_scores[away_user_id]
            home_team = game.teams_by_user_id[home_user_id]
            away_team = game.teams_by_user_id[away_user_id]

            if home_score > away_score:
                home_result, away_result = "W", "L"
                winner_team_id = home_team.team_id
            elif away_score > home_score:
                home_result, away_result = "L", "W"
                winner_team_id = away_team.team_id
            else:
                home_result = away_result = "T"
                winner_team_id = None

            updated_standings[home_user_id] = self._apply_result(
                updated_standings[home_user_id], home_score, away_score, home_result
            )
            updated_standings[away_user_id] = self._apply_result(
                updated_standings[away_user_id], away_score, home_score, away_result
            )
            events.append(
                SimulationEvent(
                    type=SimulationEventType.game_outcome,
                    week=week,
                    team_id=winner_team_id,
                    payload={
                        "kind": "fantasy_matchup",
                        "home_user_id": str(home_user_id),
                        "away_user_id": str(away_user_id),
                        "home_team": home_team.name,
                        "away_team": away_team.name,
                        "home_score": home_score,
                        "away_score": away_score,
                    },
                )
            )

        return events, updated_standings

    @staticmethod
    def _apply_result(standing: FantasyStanding, points_for: float, points_against: float, result: str) -> FantasyStanding:
        wins = standing.wins + (1 if result == "W" else 0)
        losses = standing.losses + (1 if result == "L" else 0)
        ties = standing.ties + (1 if result == "T" else 0)
        return FantasyStanding(
            wins=wins,
            losses=losses,
            ties=ties,
            points_for=round(standing.points_for + points_for, 2),
            points_against=round(standing.points_against + points_against, 2),
            streak=WeeklyNBASimulationEngine._next_streak(standing.streak, result),
        )

    @staticmethod
    def _next_streak(current: str, result: str) -> str:
        if not current or not current.startswith(result):
            return f"{result}1"
        try:
            count = int(current[1:])
        except ValueError:
            count = 0
        return f"{result}{count + 1}"


SIM_ENGINE: SimulationEngine = WeeklyNBASimulationEngine()

