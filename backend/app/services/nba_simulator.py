from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from math import ceil
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from numpy.random import default_rng


REGULAR_SEASON_WEEKS = 24


@dataclass(frozen=True)
class NBAPlayerLine:
    player_id: str
    name: str
    team: str
    pos: str
    stats: dict[str, float | int]


@dataclass(frozen=True)
class NBAGameResult:
    home: str
    away: str
    home_points: int
    away_points: int
    possessions: float


@dataclass(frozen=True)
class NBAWeekResult:
    week: int
    games: list[NBAGameResult]
    player_lines: dict[str, NBAPlayerLine]


def normalize_player_name(name: str) -> str:
    return "".join(ch for ch in name.casefold() if ch.isalnum())


def player_stat_key(name: str, team: str | None = None) -> str:
    normalized_name = normalize_player_name(name)
    normalized_team = (team or "").strip().upper()
    return f"{normalized_name}|{normalized_team}" if normalized_team else normalized_name


class NBADataSimulator:
    def __init__(self, data_dir: Path, regular_season_weeks: int = REGULAR_SEASON_WEEKS):
        self.data_dir = data_dir
        self.regular_season_weeks = regular_season_weeks
        self.rosters = self._build_rosters()
        self.team_stats = self._build_team_stats()
        self.team_rates = self._load_csv("Team Stats Per 100 Poss.csv").set_index("abbreviation")
        valid_teams = [team for team in self.team_stats.index if isinstance(team, str)]
        self.schedule = self.generate_schedule(valid_teams)
        self.avg_d_rtg = float(self.team_stats["d_rtg"].mean())

    def simulate_week(self, week: int, seed: int | None = None) -> NBAWeekResult:
        if week < 1 or week > self.regular_season_weeks:
            raise ValueError(f"Week must be between 1 and {self.regular_season_weeks}")

        rng = default_rng((seed if seed is not None else 42) + week * 1009)
        start, end = self.week_bounds(week, len(self.schedule), self.regular_season_weeks)
        games: list[NBAGameResult] = []
        player_lines: dict[str, NBAPlayerLine] = {}

        for home, away in self.schedule[start:end]:
            if home not in self.team_stats.index or away not in self.team_stats.index:
                continue
            if home not in self.rosters or away not in self.rosters:
                continue

            game, home_lines, away_lines = self._simulate_game(home, away, rng)
            games.append(game)
            for line in [*home_lines, *away_lines]:
                self._accumulate_player_line(player_lines, line)

        return NBAWeekResult(week=week, games=games, player_lines=player_lines)

    @staticmethod
    def week_bounds(week: int, total_games: int, regular_season_weeks: int = REGULAR_SEASON_WEEKS) -> tuple[int, int]:
        games_per_week = ceil(total_games / regular_season_weeks)
        start = (week - 1) * games_per_week
        return start, min(start + games_per_week, total_games)

    @staticmethod
    def generate_schedule(team_abbrevs: list[str]) -> list[tuple[str, str]]:
        rng = np.random.default_rng(42)
        teams = sorted(team_abbrevs)
        n = len(teams)
        if n % 2 != 0:
            raise ValueError("Schedule generation requires an even number of teams")

        matchings: list[list[tuple[str, str]]] = []
        circle = teams[1:]
        for _ in range(n - 1):
            round_matchings = [(teams[0], circle[0])]
            for i in range(1, n // 2):
                round_matchings.append((circle[i], circle[n - 1 - i]))
            matchings.append(round_matchings)
            circle = [circle[-1]] + circle[:-1]

        schedule: list[tuple[str, str]] = []
        for matching in matchings:
            for t1, t2 in matching:
                schedule.append((t1, t2))
                schedule.append((t2, t1))

        for matching in matchings[:12]:
            for t1, t2 in matching:
                schedule.append((t1, t2))
                schedule.append((t2, t1))

        rng.shuffle(schedule)
        return schedule

    def _load_csv(self, name: str) -> pd.DataFrame:
        path = self.data_dir / name
        if not path.exists():
            raise FileNotFoundError(f"Missing simulator data file: {path}")
        return pd.read_csv(path).replace({np.nan: 0})

    def _build_rosters(self) -> dict[str, list[dict[str, Any]]]:
        player_per36 = self._load_csv("Per 36 Minutes.csv")
        player_totals = self._load_csv("Player Totals.csv")

        keep_cols = [
            "player_id",
            "player",
            "pos",
            "fg_per_36_min",
            "fga_per_36_min",
            "x3p_per_36_min",
            "x3pa_per_36_min",
            "ft_per_36_min",
            "fta_per_36_min",
            "orb_per_36_min",
            "drb_per_36_min",
            "ast_per_36_min",
            "stl_per_36_min",
            "blk_per_36_min",
            "tov_per_36_min",
            "pf_per_36_min",
            "pts_per_36_min",
        ]
        per36_sub = player_per36[keep_cols]
        totals_sub = player_totals[["player_id", "team", "mp", "g"]].rename(columns={"mp": "tot_mp", "g": "tot_g"})
        merged = pd.merge(per36_sub, totals_sub, on="player_id")

        idx = merged.groupby("player_id")["tot_mp"].idxmax()
        merged = merged.loc[idx]

        rosters: dict[str, list[dict[str, Any]]] = {}
        for _, row in merged.iterrows():
            team = str(row["team"]).strip().upper()
            if not team:
                continue
            games_played = float(row["tot_g"])
            mp_per_game = float(row["tot_mp"]) / games_played if games_played > 0 else 0.0
            rosters.setdefault(team, []).append(
                {
                    "player_id": str(row["player_id"]),
                    "name": str(row["player"]),
                    "pos": str(row["pos"]),
                    "mp_per_game": mp_per_game,
                    "per36": {
                        "fga": float(row["fga_per_36_min"]),
                        "fgm": float(row["fg_per_36_min"]),
                        "x3pa": float(row["x3pa_per_36_min"]),
                        "x3pm": float(row["x3p_per_36_min"]),
                        "fta": float(row["fta_per_36_min"]),
                        "ftm": float(row["ft_per_36_min"]),
                        "orb": float(row["orb_per_36_min"]),
                        "drb": float(row["drb_per_36_min"]),
                        "ast": float(row["ast_per_36_min"]),
                        "stl": float(row["stl_per_36_min"]),
                        "blk": float(row["blk_per_36_min"]),
                        "tov": float(row["tov_per_36_min"]),
                        "pf": float(row["pf_per_36_min"]),
                        "pts": float(row["pts_per_36_min"]),
                    },
                }
            )
        return rosters

    def _build_team_stats(self) -> pd.DataFrame:
        team_summaries = self._load_csv("Team Summaries.csv")
        return team_summaries[["abbreviation", "o_rtg", "d_rtg", "pace"]].set_index("abbreviation")

    def _simulate_game(
        self, home: str, away: str, rng: np.random.Generator
    ) -> tuple[NBAGameResult, list[NBAPlayerLine], list[NBAPlayerLine]]:
        pace_h = float(self.team_stats.loc[home, "pace"])
        pace_a = float(self.team_stats.loc[away, "pace"])
        possessions = max(80.0, float(rng.normal((pace_h + pace_a) / 2, 1.5)))

        exp_o_h = float(self.team_stats.loc[home, "o_rtg"]) * (float(self.team_stats.loc[away, "d_rtg"]) / self.avg_d_rtg)
        exp_o_a = float(self.team_stats.loc[away, "o_rtg"]) * (float(self.team_stats.loc[home, "d_rtg"]) / self.avg_d_rtg)

        std_pts = 11.0
        pts_home = int(round(max(50.0, float(rng.normal(exp_o_h, std_pts)) * possessions / 100)))
        pts_away = int(round(max(50.0, float(rng.normal(exp_o_a, std_pts)) * possessions / 100)))

        home_box = self._make_team_box(home, possessions, rng)
        away_box = self._make_team_box(away, possessions, rng)
        home_box["pts"] = pts_home
        away_box["pts"] = pts_away

        return (
            NBAGameResult(home=home, away=away, home_points=pts_home, away_points=pts_away, possessions=possessions),
            self._player_distribution(home, home_box, rng),
            self._player_distribution(away, away_box, rng),
        )

    def _make_team_box(self, team: str, possessions: float, rng: np.random.Generator) -> dict[str, int]:
        rates = self.team_rates.loc[team]
        fga = self._poisson_stat(rates["fga_per_100_poss"], possessions, rng)
        x3pa = min(fga, self._poisson_stat(rates["x3pa_per_100_poss"], possessions, rng))
        x3pm = int(rng.binomial(x3pa, self._safe_probability(rates["x3p_percent"]))) if x3pa > 0 else 0
        x2pa = fga - x3pa
        x2pm = int(rng.binomial(x2pa, self._safe_probability(rates["x2p_percent"]))) if x2pa > 0 else 0
        fgm = x3pm + x2pm
        fta = self._poisson_stat(rates["fta_per_100_poss"], possessions, rng)
        ftm = int(rng.binomial(fta, self._safe_probability(rates["ft_percent"]))) if fta > 0 else 0

        stats = {"fga": fga, "fgm": fgm, "x3pa": x3pa, "x3pm": x3pm, "fta": fta, "ftm": ftm, "pts": 3 * x3pm + 2 * x2pm + ftm}
        for stat in ["orb", "drb", "ast", "stl", "blk", "tov", "pf"]:
            stats[stat] = self._poisson_stat(rates[f"{stat}_per_100_poss"], possessions, rng)
        return stats

    def _player_distribution(self, team: str, team_box: dict[str, int], rng: np.random.Generator) -> list[NBAPlayerLine]:
        players = [dict(player) for player in self.rosters.get(team, [])]
        if not players:
            return []

        for player in players:
            if rng.random() < 0.05:
                player["sim_mp"] = 0.0
            else:
                player["sim_mp"] = max(0.0, min(48.0, float(rng.normal(player["mp_per_game"], 2.0))))

        active = [player for player in players if player["sim_mp"] > 0]
        if not active:
            return []

        for player in active:
            factor = player["sim_mp"] / 36.0
            player["exp"] = {stat: player["per36"][stat] * factor for stat in team_box}

        results: list[NBAPlayerLine] = []
        for player in active:
            stats: dict[str, float | int] = {"g": 1, "mp": round(float(player["sim_mp"]), 1)}
            for stat, team_total in team_box.items():
                sum_exp = sum(float(other["exp"][stat]) for other in active)
                probability = float(player["exp"][stat]) / sum_exp if sum_exp > 0 else 0.0
                stats[stat] = int(rng.binomial(team_total, min(probability, 1.0))) if team_total > 0 and probability > 0 else 0

            stats["fgm"] = min(int(stats["fgm"]), int(stats["fga"]))
            stats["x3pm"] = min(int(stats["x3pm"]), int(stats["x3pa"]), int(stats["fgm"]))
            stats["ftm"] = min(int(stats["ftm"]), int(stats["fta"]))
            stats["pts"] = 3 * int(stats["x3pm"]) + 2 * (int(stats["fgm"]) - int(stats["x3pm"])) + int(stats["ftm"])
            stats["reb"] = int(stats["orb"]) + int(stats["drb"])

            results.append(
                NBAPlayerLine(
                    player_id=str(player["player_id"]),
                    name=str(player["name"]),
                    team=team,
                    pos=str(player["pos"]),
                    stats=stats,
                )
            )
        return results

    def _accumulate_player_line(self, player_lines: dict[str, NBAPlayerLine], line: NBAPlayerLine) -> None:
        key = player_stat_key(line.name, line.team)
        existing = player_lines.get(key)
        if existing is None:
            player_lines[key] = line
            return

        merged_stats = dict(existing.stats)
        for stat, value in line.stats.items():
            merged_stats[stat] = round(float(merged_stats.get(stat, 0)) + float(value), 1) if stat == "mp" else int(merged_stats.get(stat, 0)) + int(value)
        player_lines[key] = NBAPlayerLine(player_id=line.player_id, name=line.name, team=line.team, pos=line.pos, stats=merged_stats)

    @staticmethod
    def _poisson_stat(rate: float, possessions: float, rng: np.random.Generator) -> int:
        return max(0, int(rng.poisson(float(rate) * possessions / 100)))

    @staticmethod
    def _safe_probability(value: float) -> float:
        probability = float(value)
        if np.isnan(probability):
            return 0.0
        return max(0.0, min(1.0, probability))


@lru_cache(maxsize=4)
def get_nba_simulator(data_dir: str) -> NBADataSimulator:
    return NBADataSimulator(Path(data_dir))
