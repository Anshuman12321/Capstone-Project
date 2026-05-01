import { useState } from 'react'
import { apiUrl } from '../lib/api'
import { draftBoard } from '../mockData'
import type { Game } from '../types'

type DraftType = 'snake' | 'linear'

type DraftPageProps = {
  activeGame: Game
  onGameUpdated: (game: Game) => void
}

export function DraftPage({ activeGame, onGameUpdated }: DraftPageProps) {
  const [draftType, setDraftType] = useState<DraftType>('snake')
  const [rounds, setRounds] = useState(15)
  const [secondsPerPick, setSecondsPerPick] = useState(90)
  const [progressing, setProgressing] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const featuredPlayer = draftBoard[0]
  const queuedPlayers = draftBoard.slice(1, 4)
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

  return (
    <div className="draft-page space-y-8">
      <section className="draft-hero">
        <div>
          <h1>Week {activeGame.current_week || 0}</h1>
          <p>{activeGame.name} is ready for the next simulated NBA scoring week.</p>
        </div>
        <div className="glass-panel draft-timer">
          <div className="text-center">
            <p>Current Week</p>
            <strong>{activeGame.current_week}</strong>
          </div>
          <div className="timer-rule" />
          <div>
            <p>League Status</p>
            <span>{activeGame.status.replace('_', ' ').toUpperCase()}</span>
          </div>
          <button type="button" className="primary-cta compact" onClick={handleProgressWeek} disabled={progressing}>
            {progressing ? 'Progressing...' : 'Progress Week'}
          </button>
        </div>
      </section>

      {(progressMessage || progressError) && (
        <section className="week-progress-panel glass-panel">
          {progressMessage && <p className="week-progress-success">{progressMessage}</p>}
          {progressError && <p className="login-error">{progressError}</p>}
        </section>
      )}

      <div className="draft-grid">
        <section className="draft-feed">
          <h2>
            <span className="material-symbols-outlined">history</span>
            Weekly Activity
          </h2>
          <div className="space-y-3">
            {latestMatchup ? (
              <article className="activity-card">
                <span>{String(latestMatchup.week).padStart(2, '0')}</span>
                <div>
                  <p>
                    {latestMatchup.payload.home_team} {Number(latestMatchup.payload.home_score).toFixed(1)} -{' '}
                    {Number(latestMatchup.payload.away_score).toFixed(1)} {latestMatchup.payload.away_team}
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

        <section className="draft-board">
          <div className="board-head">
            <h2>Top Available Talent</h2>
            <div className="board-search">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search Prospects" type="text" />
            </div>
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
                  {featuredPlayer.team} guard with elite projected value and a mock ADP of{' '}
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
              <button type="button" className="primary-cta compact">
                Draft Player
              </button>
            </article>
          )}

          <div className="prospect-list">
            {draftBoard.map((p) => (
              <article key={p.name} className="prospect-row">
                <span className="rank">{p.rank}</span>
                <div>
                  <p>{p.name}</p>
                  <small>
                    {p.team} · ADP {p.adp.toFixed(1)}
                  </small>
                </div>
                <span className={`pos pos-${p.pos}`}>{p.pos}</span>
                <button type="button" className="queue-button">
                  Queue
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="draft-settings glass-panel">
          <h2>Draft Control</h2>
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
          <div className="queue-panel">
            <p>Queue</p>
            {queuedPlayers.map((player) => (
              <div key={player.name}>
                <span>{player.name}</span>
                <small>{player.pos}</small>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
