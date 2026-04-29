import { standings } from '../mockData'

export function StandingsPage() {
  const topTeams = standings.slice(0, 4)

  return (
    <div className="standings-page">
      <section className="league-hero">
        <img
          alt=""
          aria-hidden="true"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfS-1JZNuuqYCYuUBpu8kHNnbL17IPXRHSDYd0AXfSy-5Srs3l_jfDgfSs1B5cSQgOwg9weSATMzOYI_y-x0zUOKoWJUbdY2ZDd093Nv83FsUurJtQOHVHMQouddHOOJ8MScg_Aw2TiHqNnF3qeqpdHk6oDP04RvzkzZR3OktsExqHw61IecMYf-0TbTo5irX166sSRFvwuYHs13UsSgP5s4nawxZ3sEykQom0lM2leGas-4cq9WJbwWjX9e96mEPw7hFg8D0tKhQ"
        />
        <div>
          <span>Week 14 Simulation</span>
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
              {[
                ['HOU', '112', 'MIA', '98', 'J. Green (34 PTS)'],
                ['LAL', '105', 'GSW', '121', 'S. Curry (41 PTS)'],
                ['NYK', '118', 'BOS', '114', 'J. Brunson (28 PTS)'],
              ].map(([away, awayScore, home, homeScore, scorer]) => (
                <article key={`${away}-${home}`} className="game-row">
                  <div>
                    <div className="team-score">
                      <p>{away}</p>
                      <strong className={Number(awayScore) > Number(homeScore) ? 'winner' : ''}>{awayScore}</strong>
                    </div>
                    <div className="score-rule" />
                    <div className="team-score">
                      <p>{home}</p>
                      <strong className={Number(homeScore) > Number(awayScore) ? 'winner' : ''}>{homeScore}</strong>
                    </div>
                    <div className="top-scorer">
                      <small>Top Scorer</small>
                      <span>{scorer}</span>
                    </div>
                  </div>
                  <span>Final</span>
                </article>
              ))}
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
              {[40, 65, 90, 55, 75, 45, 82].map((height, index) => (
                <div key={height + index} style={{ height: `${height}%` }}>
                  <span>{['12.4', '18.1', '24.8', '15.9', '21.2', '13.7', '23.1'][index]}</span>
                </div>
              ))}
            </div>
            <div className="trend-days">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </section>
        </div>

        <aside className="standings-card">
          <div className="p-8 border-b border-outline-variant/10">
            <h2>League Standings</h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {standings.map((row) => (
              <article key={row.team} className={row.owner === 'You' ? 'standing-row active' : 'standing-row'}>
                <div>
                  <span>{String(row.rank).padStart(2, '0')}</span>
                  <div>
                    <strong>{row.team}</strong>
                    <small>{row.owner}</small>
                  </div>
                </div>
                <p>
                  {row.w}-{row.l}-{row.t}
                </p>
              </article>
            ))}
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
                <tr key={row.team} className={row.owner === 'You' ? 'highlight-row' : undefined}>
                  <td>{row.rank}</td>
                  <td className="name">{row.team}</td>
                  <td>{row.owner}</td>
                  <td>
                    {row.w}-{row.l}-{row.t}
                  </td>
                  <td>{row.pf.toFixed(1)}</td>
                  <td>{row.pa.toFixed(1)}</td>
                  <td>{row.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
