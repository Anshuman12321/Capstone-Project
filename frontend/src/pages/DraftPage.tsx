import { useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../lib/api'
import { draftBoard } from '../mockData'
import type { AuthUser, Game } from '../types'

type DraftType = 'snake' | 'linear'

type DraftPageProps = {
  activeGame: Game
  user: AuthUser
  onGameUpdated: (game: Game) => void
}

type SortKey = 'pts_per_game' | 'trb_per_game' | 'ast_per_game' | 'name'

type Player = {
  player_id: string
  full_name: string
  position: string
  real_team: string | null
  stats: Record<string, string | number>
}

export function DraftPage({ activeGame, user, onGameUpdated }: DraftPageProps) {
  const [draftType, setDraftType] = useState<DraftType>('snake')
  const [rounds, setRounds] = useState(15)
  const [secondsPerPick, setSecondsPerPick] = useState(90)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [progressing, setProgressing] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('pts_per_game')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [draftingPlayerId, setDraftingPlayerId] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const featuredPlayer = draftBoard[0]
  const queuedPlayers = draftBoard.slice(1, 5)
  const recentActivity = draftBoard.slice(0, 4)

  const loadPlayers = async () => {
    setLoadingPlayers(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      params.set('sort', sortKey)
      params.set('direction', sortDir)
      params.set('limit', '200')
      params.set('offset', '0')
      const res = await fetch(apiUrl(`/api/players?${params.toString()}`))
      if (!res.ok) throw new Error(`Failed to load players (HTTP ${res.status})`)
      const data = (await res.json()) as Player[]
      setPlayers(data)
    } finally {
      setLoadingPlayers(false)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void loadPlayers(), 150)
    return () => window.clearTimeout(t)
  }, [activeGame.game_id, search, sortKey, sortDir])

  const draftSelected = async (playerId: string) => {
    setDraftError(null)
    setDraftingPlayerId(playerId)
    try {
      if (activeGame.status !== 'drafting') {
        throw new Error('Draft has not started yet.')
      }
      const res = await fetch(apiUrl(`/api/games/${activeGame.game_id}/draft/pick`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, player_id: playerId }),
      })
      if (!res.ok) {
        let message = `Draft failed (HTTP ${res.status})`
        try {
          const body = (await res.json()) as { detail?: string }
          if (body.detail) message = body.detail
        } catch {
          // ignore
        }
        throw new Error(message)
      }
      const updated = (await res.json()) as Game
      onGameUpdated(updated)
      setProgressMessage('Draft pick submitted.')
    } catch (e: unknown) {
      setDraftError(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDraftingPlayerId(null)
    }
  }

  const availablePlayers = useMemo(() => {
    const drafted = new Set(activeGame.drafted_player_ids ?? [])
    return players.filter((p) => !drafted.has(p.player_id))
  }, [players, activeGame.drafted_player_ids])

  const fantasyMatchups = activeGame.simulation_events.filter(
    (event) => event.type === 'game_outcome' && event.payload.kind === 'fantasy_matchup',
  )
  const latestMatchup = fantasyMatchups.at(-1)

  const handleProgressWeek = async () => {
    setProgressing(true)
    setProgressMessage(null)
    setProgressError(null)
    try {
      const res = await fetch(apiUrl(`/api/games/${activeGame.game_id}/simulate/next-week`), {
        method: 'POST',
      })
      if (!res.ok) {
        let message = `Failed to progress week (HTTP ${res.status})`
        try {
          const body = (await res.json()) as { detail?: string }
          if (body.detail) message = body.detail
        } catch {
          // Keep the HTTP fallback when the response is not JSON.
        }
        throw new Error(message)
      }
      const updatedGame = (await res.json()) as Game
      onGameUpdated(updatedGame)
      setProgressMessage(`Advanced to Week ${updatedGame.current_week}.`)
    } catch (e: unknown) {
      setProgressError(e instanceof Error ? e.message : 'Failed to progress week')
    } finally {
      setProgressing(false)
    }
  }

  const isOwner = activeGame.owner_user_id === user.user_id

  const handleTopAction = async () => {
    setProgressing(true)
    setProgressMessage(null)
    setProgressError(null)
    setDraftError(null)
    try {
      if (activeGame.status === 'lobby') {
        if (!isOwner) {
          throw new Error('Only the league owner can start the draft.')
        }
        const res = await fetch(apiUrl(`/api/games/${activeGame.game_id}/draft/start`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_user_id: user.user_id }),
        })
        if (!res.ok) {
          let message = `Failed to start draft (HTTP ${res.status})`
          try {
            const body = (await res.json()) as { detail?: string }
            if (body.detail) message = body.detail
          } catch {
            // ignore
          }
          throw new Error(message)
        }
        const updated = (await res.json()) as Game
        onGameUpdated(updated)
        setProgressMessage('Draft started.')
        return
      }

      if (activeGame.status === 'drafting') {
        if (!isOwner) {
          throw new Error('Only the league owner can cancel the draft.')
        }
        const res = await fetch(apiUrl(`/api/games/${activeGame.game_id}/draft/cancel`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_user_id: user.user_id }),
        })
        if (!res.ok) {
          let message = `Failed to cancel draft (HTTP ${res.status})`
          try {
            const body = (await res.json()) as { detail?: string }
            if (body.detail) message = body.detail
          } catch {
            // ignore
          }
          throw new Error(message)
        }
        const updated = (await res.json()) as Game
        onGameUpdated(updated)
        setProgressMessage('Draft cancelled.')
        return
      }

      await handleProgressWeek()
    } catch (e: unknown) {
      setProgressError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setProgressing(false)
    }
  }

  const topActionLabel =
    activeGame.status === 'lobby'
      ? 'Start draft'
      : activeGame.status === 'drafting'
        ? 'Cancel draft'
        : 'Simulate week'

  const statusLabel = activeGame.status.replace('_', ' ')

  return (
    <div className="draft-page space-y-8">
      <section className="draft-hero">
        <div className="draft-hero-headline">
          <h1>Draft Dashboard</h1>
          <p>
            {activeGame.name} · Week {activeGame.current_week} · simulated scoring week controls below.
          </p>
        </div>
      </section>

      <section className="draft-status-strip">
        <article className="status-item">
          <p>League status</p>
          <strong>{statusLabel}</strong>
        </article>
        <article className="status-item">
          <p>Current week</p>
          <strong>Week {activeGame.current_week}</strong>
        </article>
        <article className="status-item timer">
          <p>Pick clock (mock)</p>
          <strong>
            {String(Math.floor(secondsPerPick / 60)).padStart(2, '0')}:
            {String(secondsPerPick % 60).padStart(2, '0')}
          </strong>
        </article>
        <article className="status-item draft-progress-action">
          <p>{activeGame.status === 'drafting' ? 'Draft' : 'League'}</p>
          <button type="button" className="primary-cta compact" onClick={handleTopAction} disabled={progressing}>
            {progressing ? 'Working...' : topActionLabel}
          </button>
        </article>
      </section>

      {(progressMessage || progressError) && (
        <section className="week-progress-panel glass-panel">
          {progressMessage && <p className="week-progress-success">{progressMessage}</p>}
          {progressError && <p className="login-error">{progressError}</p>}
          {draftError && <p className="login-error">{draftError}</p>}
        </section>
      )}

      <section className="draft-feed">
        <h2>
          <span className="material-symbols-outlined">history</span>
          Weekly activity
        </h2>
        <div className="space-y-3">
          {latestMatchup ? (
            <article className="activity-card">
              <span>{String(latestMatchup.week).padStart(2, '0')}</span>
              <div>
                <p>
                  {String(latestMatchup.payload.home_team)} {Number(latestMatchup.payload.home_score).toFixed(1)} -{' '}
                  {Number(latestMatchup.payload.away_score).toFixed(1)} {String(latestMatchup.payload.away_team)}
                </p>
                <small>Latest fantasy matchup</small>
              </div>
            </article>
          ) : (
            <article className="activity-card pending">
              <span>00</span>
              <div>
                <p>No simulated weeks yet</p>
                <small>Draft rosters, then progress the week</small>
              </div>
            </article>
          )}
        </div>
      </section>

      <div className="draft-grid">
        <section className="draft-board">
          <div className="board-head">
            <h2>Available players</h2>
            <div className="board-search">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search players" type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="board-controls">
            <label>
              Sort
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="pts_per_game">PTS</option>
                <option value="trb_per_game">REB</option>
                <option value="ast_per_game">AST</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label>
              Dir
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
            {loadingPlayers && <small>Loading…</small>}
          </div>

          {featuredPlayer && (
            <article className="featured-prospect">
              <div className="absolute top-0 right-0 p-8 z-10 text-right">
                <p className="prospect-score">94</p>
              </div>
              <div className="relative z-10">
                <span className={`pos pos-${featuredPlayer.pos}`}>{featuredPlayer.pos}</span>
                <h3>{featuredPlayer.name}</h3>
                <p>
                  {featuredPlayer.team} guard with strong projection value and an ADP of{' '}
                  {featuredPlayer.adp.toFixed(1)}.
                </p>
                <div className="prospect-stats">
                  <div>
                    <span>RANK</span>
                    <strong>{featuredPlayer.rank}</strong>
                  </div>
                  <div>
                    <span>ADP</span>
                    <strong>{featuredPlayer.adp.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span>TEAM</span>
                    <strong>{featuredPlayer.team}</strong>
                  </div>
                </div>
              </div>
              <div className="featured-actions">
                <button type="button" className="primary-cta compact">
                  Draft selected player
                </button>
                <button type="button" className="glass-cta compact">
                  Add to queue
                </button>
              </div>
            </article>
          )}

          <div className="prospect-list">
            {availablePlayers.map((p, idx) => (
              <article key={p.player_id} className="prospect-row">
                <span className="rank">{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <p>{p.full_name}</p>
                  <small>
                    {p.real_team ?? '—'} · PTS {Number(p.stats.pts_per_game ?? 0).toFixed(1)}
                  </small>
                </div>
                <span className={`pos pos-${p.position}`}>{p.position}</span>
                <button
                  type="button"
                  className="queue-button"
                  disabled={Boolean(draftingPlayerId)}
                  onClick={() => void draftSelected(p.player_id)}
                >
                  {draftingPlayerId === p.player_id ? 'Drafting…' : 'Draft'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="draft-side-column">
          <section className="draft-settings glass-panel">
            <button
              type="button"
              className="settings-toggle"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((prev) => !prev)}
            >
              <span>Draft settings</span>
              <span className="material-symbols-outlined">{settingsOpen ? 'expand_less' : 'expand_more'}</span>
            </button>

            {settingsOpen && (
              <>
                <div className="option-group" role="radiogroup" aria-label="Draft format">
                  <label className={`option-tile ${draftType === 'snake' ? 'active' : ''}`}>
                    <input type="radio" name="draftType" checked={draftType === 'snake'} onChange={() => setDraftType('snake')} />
                    <span className="option-title">Snake draft</span>
                    <span className="option-desc">Order reverses each round for balanced fantasy play.</span>
                  </label>
                  <label className={`option-tile ${draftType === 'linear' ? 'active' : ''}`}>
                    <input type="radio" name="draftType" checked={draftType === 'linear'} onChange={() => setDraftType('linear')} />
                    <span className="option-title">Linear draft</span>
                    <span className="option-desc">Same pick order every round for fast mock drafts.</span>
                  </label>
                </div>
                <div className="settings-grid">
                  <label className="field">
                    <span>Rounds</span>
                    <input type="number" min={10} max={20} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
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
                </div>
              </>
            )}
          </section>

          <section className="queue-panel">
            <p>Your queue</p>
            {queuedPlayers.map((player) => (
              <div key={player.name}>
                <span>{player.name}</span>
                <small>
                  {player.pos} · ADP {player.adp.toFixed(1)}
                </small>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <section className="draft-feed">
        <h2>
          <span className="material-symbols-outlined">history</span>
          Recent picks
        </h2>
        <div className="space-y-3">
          {recentActivity.map((player, index) => (
            <article key={`${player.name}-${index}`} className="activity-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p>{player.name}</p>
                <small>
                  Selected by {index % 2 === 0 ? 'Gotham Knights' : 'Metro Hawks'} · {player.team}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
