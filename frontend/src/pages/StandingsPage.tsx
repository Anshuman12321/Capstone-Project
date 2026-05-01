import type { AuthUser, FantasyStanding, Game } from '../types'

type StandingsPageProps = {
  activeGame: Game
  user: AuthUser | null
}

type StandingRow = FantasyStanding & {
  userId: string
  rank: number
  team: string
  owner: string
}

const emptyStanding: FantasyStanding = {
  wins: 0,
  losses: 0,
  ties: 0,
  points_for: 0,
  points_against: 0,
  streak: '',
}

export function StandingsPage({ activeGame, user }: StandingsPageProps) {
  const rows: StandingRow[] = Object.entries(activeGame.teams_by_user_id)
    .map(([userId, team]) => ({
      userId,
      team: team.name,
      owner: userId === user?.user_id ? 'You' : userId.slice(0, 8),
      ...(activeGame.standings[userId] ?? emptyStanding),
      rank: 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.points_for - a.points_for || a.losses - b.losses)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const recentMatchups = activeGame.simulation_events
    .filter((event) => event.type === 'game_outcome' && event.payload.kind === 'fantasy_matchup')
    .slice(-3)
    .reverse()
  const nbaResults = activeGame.simulation_events
    .filter((event) => event.type === 'game_outcome' && event.payload.kind === 'nba_game')
    .slice(-7)
  const topTeams = rows.slice(0, 4)

  return (
    <div className="standings-page">
      <section className="league-hero">
        <img
          alt=""
          aria-hidden="true"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfS-1JZNuuqYCYuUBpu8kHNnbL17IPXRHSDYd0AXfSy-5Srs3l_jfDgfSs1B5cSQgOwg9weSATMzOYI_y-x0zUOKoWJUbdY2ZDd093Nv83FsUurJtQOHVHMQouddHOOJ8MScg_Aw2TiHqNnF3qeqpdHk6oDP04RvzkzZR3OktsExqHw61IecMYf-0TbTo5irX166sSRFvwuYHs13UsSgP5s4nawxZ3sEykQom0lM2leGas-4cq9WJbwWjX9e96mEPw7hFg8D0tKhQ"
        />
        <div>
          <span>Week {activeGame.current_week} Simulation</span>
          <h1>League Supremacy</h1>
          <p>
            The front office analysis of standings, scoring trends, and player performance
            metrics across the league.
          </p>
        </div>
      </section>

      <div className="league-grid">
        <div className="space-y-8">
          <section className="matchup-card">
            <div className="section-head">
              <h2>Recent Matchups</h2>
              <a href="#/standings">Full Schedule</a>
            </div>
            <div className="space-y-4">
              {recentMatchups.length > 0 ? (
                recentMatchups.map((event) => (
                  <article key={event.event_id} className="game-row">
                    <div>
                      <div className="team-score">
                        <p>{event.payload.away_team}</p>
                        <strong className={Number(event.payload.away_score) > Number(event.payload.home_score) ? 'winner' : ''}>
                          {Number(event.payload.away_score).toFixed(1)}
                        </strong>
                      </div>
                      <div className="score-rule" />
                      <div className="team-score">
                        <p>{event.payload.home_team}</p>
                        <strong className={Number(event.payload.home_score) > Number(event.payload.away_score) ? 'winner' : ''}>
                          {Number(event.payload.home_score).toFixed(1)}
                        </strong>
                      </div>
                      <div className="top-scorer">
                        <small>Week</small>
                        <span>{event.week}</span>
                      </div>
                    </div>
                    <span>Final</span>
                  </article>
                ))
              ) : (
                <article className="game-row">
                  <div>
                    <div className="top-scorer">
                      <small>No results yet</small>
                      <span>Use Progress Week on the dashboard.</span>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </section>

          <section className="trend-card">
            <div className="section-head">
              <h2>Scoring Efficiency Trend</h2>
              <div className="flex gap-2">
                <span className="legend-dot active" />
                <span className="legend-dot" />
              </div>
            </div>
            <div className="trend-bars">
              {(nbaResults.length > 0 ? nbaResults : []).map((event) => {
                const total = Number(event.payload.home_points) + Number(event.payload.away_points)
                const height = Math.max(20, Math.min(100, (total / 280) * 100))
                return (
                  <div key={event.event_id} style={{ height: `${height}%` }}>
                    <span>{total}</span>
                  </div>
                )
              })}
              {nbaResults.length === 0 &&
                [20, 20, 20, 20, 20, 20, 20].map((height, index) => (
                  <div key={height + index} style={{ height: `${height}%` }}>
                    <span>0</span>
                  </div>
                ))}
            </div>
            <div className="trend-days">
              {(nbaResults.length > 0 ? nbaResults : Array.from({ length: 7 })).map((_, index) => (
                <span key={index}>G{index + 1}</span>
              ))}
            </div>
          </section>
        </div>

        <aside className="standings-card">
          <div className="p-8 border-b border-outline-variant/10">
            <h2>League Standings</h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {rows.map((row) => (
              <article key={row.userId} className={row.owner === 'You' ? 'standing-row active' : 'standing-row'}>
                <div>
                  <span>{String(row.rank).padStart(2, '0')}</span>
                  <div>
                    <strong>{row.team}</strong>
                    <small>{row.owner}</small>
                  </div>
                </div>
                <p>
                  {row.wins}-{row.losses}-{row.ties}
                </p>
              </article>
            ))}
            {rows.length === 0 && <p className="standings-empty">No teams have joined this league yet.</p>}
          </div>
        </aside>
      </div>

      <section className="full-table-card">
        <div className="section-head">
          <h2>Playoff Picture</h2>
          <span>Sorted by wins, then points for</span>
        </div>
        <div className="table-wrap">
          <table className="data-table standings">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Owner</th>
                <th>W-L-T</th>
                <th>PF</th>
                <th>PA</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {topTeams.map((row) => (
                <tr key={row.userId} className={row.owner === 'You' ? 'highlight-row' : undefined}>
                  <td>{row.rank}</td>
                  <td className="name">{row.team}</td>
                  <td>{row.owner}</td>
                  <td>
                    {row.wins}-{row.losses}-{row.ties}
                  </td>
                  <td>{row.points_for.toFixed(1)}</td>
                  <td>{row.points_against.toFixed(1)}</td>
                  <td>{row.streak || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topTeams.length === 0 && <p className="standings-empty">Standings will appear after teams join and weeks are simulated.</p>}
        </div>
      </section>
    </div>
  )
}
