import { useApp } from '../AppState'

export function StandingsPage() {
  const { user, game } = useApp()

  if (!game) return null;

  const teamsList = Object.values(game.teams_by_user_id || {}) as any[];

  // Sort teams by standings, or if empty just by name
  const sortedTeams = [...teamsList].sort((a, b) => {
    const winsA = game.standings[a.owner_user_id] || 0;
    const winsB = game.standings[b.owner_user_id] || 0;
    return winsB - winsA; // Highest wins first
  });

  return (
    <div className="page">
      <header className="page-header">
        <h1>League standings</h1>
        <p className="lede">
          Regular season · Week {game.current_week}.
        </p>
      </header>

      <section className="card">
        <div className="table-wrap">
          <table className="data-table standings">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Format</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((t, i) => {
                const wins = game.standings[t.owner_user_id] || 0;
                const losses = Math.max(0, game.current_week - wins);

                return (
                  <tr key={t.team_id} className={t.owner_user_id === user?.user_id ? 'highlight-row' : undefined}>
                    <td>{i + 1}</td>
                    <td className="name">{t.name}</td>
                    <td>{wins}</td>
                    <td>{losses}</td>
                    <td>H2H / Points</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
