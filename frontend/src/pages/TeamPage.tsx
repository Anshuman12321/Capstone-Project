import { useState, useEffect } from 'react'
import { useApp } from '../AppState'

interface Player {
  player_id: string;
  full_name: string;
  position: string;
  real_team?: string;
}

export function TeamPage() {
  const { user, team, game, showToast } = useApp()
  const [players, setPlayers] = useState<Player[]>([])

  const handleTrade = async () => {
    try {
      const res = await fetch(`/api/games/${game?.game_id}/trade`, { method: 'POST' });
      const data = await res.json();
      showToast(data.message, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  const handleWaivers = async () => {
    try {
      const res = await fetch(`/api/games/${game?.game_id}/transactions`, { method: 'POST' });
      const data = await res.json();
      showToast(data.message, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => setPlayers(data))
  }, [])

  // Resolve player IDs to player objects
  const roster = team?.roster_player_ids || [];
  const rosterPlayers = roster.map(id => players.find(p => p.player_id === id)).filter(Boolean) as Player[];

  return (
    <div className="page">
      <header className="page-header">
        <div className="team-head">
          <div>
            <h1>Team management</h1>
            <p className="lede">
              {team?.name} · Managed by {user?.username}
            </p>
          </div>
          <div className="actions">
            <button type="button" className="btn-secondary" onClick={handleTrade}>
              Propose trade
            </button>
            <button type="button" className="btn-primary" onClick={handleWaivers}>
              Add / drop
            </button>
          </div>
        </div>
      </header>

      <section className="card">
        <h2>Active Roster</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Player</th>
                <th>Pos</th>
                <th>NBA Team</th>
              </tr>
            </thead>
            <tbody>
              {rosterPlayers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    No players on roster. Go to the Draft tab to select players!
                  </td>
                </tr>
              ) : rosterPlayers.map((row, i) => (
                <tr key={row.player_id}>
                  <td className="slot-label">{i + 1}</td>
                  <td className="name">{row.full_name}</td>
                  <td>
                    <span className={`pos pos-${row.position}`}>
                      {row.position}
                    </span>
                  </td>
                  <td>{row.real_team || 'FA'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

