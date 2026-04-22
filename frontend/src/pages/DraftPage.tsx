import { useState, useEffect } from 'react'
import { draftBoard } from '../mockData'
import { useApp } from '../AppState'

interface Player {
  player_id: string;
  full_name: string;
  position: string;
  real_team?: string;
}

type DraftType = 'snake' | 'linear'

export function DraftPage() {
  const { user, game, setGame } = useApp()
  const [draftType, setDraftType] = useState<DraftType>('snake')
  const [rounds, setRounds] = useState(15)
  const [secondsPerPick, setSecondsPerPick] = useState(90)

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const fetchPlayers = () => {
    setLoading(true)
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  const seedPlayers = async () => { /* now handled in SetupFlow.tsx */ }

  const handleStartDraft = async () => {
    if (!game) return
    try {
      const res = await fetch(`/api/games/${game.game_id}/draft/start`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setActionMsg('Draft Started!')
      setGame(await res.json())
    } catch (e: any) {
      setActionMsg(`Failed to start draft: ${e.message}`)
    }
  }

  const handleDraftPick = async (playerId: string) => {
    if (!game || !user) return
    try {
      const res = await fetch(`/api/games/${game.game_id}/draft/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, player_id: playerId })
      })
      if (!res.ok) throw new Error(await res.text())
      setActionMsg('Drafted player successfully!')
      setGame(await res.json())
    } catch (e: any) {
      setActionMsg(`Draft Error: ${e.message}`)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Draft options</h1>
        <p className="lede">
          Configure how your league runs its draft. Press Start Draft to initialize the draft queue over your real-time FastAPI endpoints.
        </p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2>Draft format</h2>
          <div className="option-group" role="radiogroup" aria-label="Draft format">
            <label className={`option-tile ${draftType === 'snake' ? 'active' : ''}`}>
              <input
                type="radio"
                name="draftType"
                checked={draftType === 'snake'}
                onChange={() => setDraftType('snake')}
              />
              <span className="option-title">Snake draft</span>
              <span className="option-desc">
                Order reverses each round (1–N, N–1, …). Most common for fantasy.
              </span>
            </label>
            <label className={`option-tile ${draftType === 'linear' ? 'active' : ''}`}>
              <input
                type="radio"
                name="draftType"
                checked={draftType === 'linear'}
                onChange={() => setDraftType('linear')}
              />
              <span className="option-title">Linear draft</span>
              <span className="option-desc">
                Same pick order every round. Faster for mock drafts or simple leagues.
              </span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Timing & length</h2>
          <label className="field">
            <span>Rounds</span>
            <input
              type="number"
              min={10}
              max={20}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Seconds per pick</span>
            <input
              type="number"
              min={30}
              max={300}
              step={15}
              value={secondsPerPick}
              onChange={(e) => setSecondsPerPick(Number(e.target.value))}
            />
          </label>
          <p className="muted small">
            Roster slots follow league rules (QB/RB/WR/TE/FLEX/K/DEF + bench). Adjust
            in league settings when you add backend support.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Available players</h2>
          <div>
            {actionMsg && <span className="pill" style={{ marginRight: '8px', background: 'var(--accent-secondary)' }}>{actionMsg}</span>}
            <button onClick={handleStartDraft} className="btn-primary" style={{ marginRight: '8px' }}>Start Draft</button>
            <button onClick={fetchPlayers} className="btn-ghost" disabled={loading} style={{ marginRight: '8px' }}>Refresh</button>
            <span className="pill">Live data</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Pos</th>
                <th>NFL</th>
                <th>ADP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No players found. <button onClick={seedPlayers} className="btn-secondary">Seed Mock Players</button>
                  </td>
                </tr>
              )}
              {players.map((p, index) => {
                const mockAdp = draftBoard.find(mb => mb.name === p.full_name)?.adp;

                return (
                  <tr key={p.player_id}>
                    <td>{index + 1}</td>
                    <td className="name">{p.full_name}</td>
                    <td>
                      <span className={`pos pos-${p.position}`}>{p.position}</span>
                    </td>
                    <td>{p.real_team || 'FA'}</td>
                    <td>{mockAdp ? mockAdp.toFixed(1) : '—'}</td>
                    <td>
                      <button type="button" className="btn-ghost" onClick={() => handleDraftPick(p.player_id)}>
                        Draft
                      </button>
                    </td>
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
