import { useState } from 'react'
import { useApp } from '../AppState'

export function HomePage() {
  const { user, game, team, setGame, showToast } = useApp()
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const simulateWeek = async () => {
    if (!game) return
    setSimulating(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${game.game_id}/simulate/next-week`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setGame(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{game?.name || "Banana Ball Dashboard"}</h1>
        <p className="lede">
          Welcome back, {user?.username}. You are managing <strong>{team?.name}</strong>.
          <br />
          <span style={{ fontSize: '0.875rem' }} className="muted">Game ID to Share: {game?.game_id}</span>
        </p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2>Game Status</h2>
          <p style={{ marginBottom: '1rem' }}>
            <span className="pill" style={{ background: 'var(--accent-secondary)' }}>{game?.status.toUpperCase()}</span>
          </p>
          <p><strong>Current Week:</strong> {game?.current_week}</p>
          <p><strong>Max Teams:</strong> {game?.settings.max_teams}</p>
        </section>

        {game?.owner_user_id === user?.user_id && (
          <section className="card">
            <h2>Simulate Season</h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              Advance the current week and let the backend simulation engine crunch numbers and stats.
            </p>
            {error && <p className="error-msg">{error}</p>}
            <button
              className="btn-primary"
              onClick={simulateWeek}
              disabled={simulating || game?.status !== 'drafting' && game?.status !== 'in_progress'}
            >
              {simulating ? 'Simulating...' : 'Simulate Next Week'}
            </button>
          </section>
        )}
        {game?.owner_user_id === user?.user_id && (
          <section className="card">
            <h2>League Settings</h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              Modify league mechanics, pause the draft, or transfer ownership. (Stub)
            </p>
            <button className="btn-secondary" onClick={() => showToast("Settings updated (Stub)", "success")}>
              Save Settings
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
