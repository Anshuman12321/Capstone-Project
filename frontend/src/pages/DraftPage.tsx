import { useState } from 'react'
import { draftBoard } from '../mockData'

type DraftType = 'snake' | 'linear'

export function DraftPage() {
  const [draftType, setDraftType] = useState<DraftType>('snake')
  const [rounds, setRounds] = useState(15)
  const [secondsPerPick, setSecondsPerPick] = useState(90)
  const featuredPlayer = draftBoard[0]
  const queuedPlayers = draftBoard.slice(1, 4)

  return (
    <div className="draft-page space-y-8">
      <section className="draft-hero">
        <div>
          <h1>Round 1, Pick 4</h1>
          <p>The Gotham Knights are now on the clock.</p>
        </div>
        <div className="glass-panel draft-timer">
          <div className="text-center">
            <p>Time Remaining</p>
            <strong>
              {String(Math.floor(secondsPerPick / 60)).padStart(2, '0')}:
              {String(secondsPerPick % 60).padStart(2, '0')}
            </strong>
          </div>
          <div className="timer-rule" />
          <div>
            <p>Current Strategy</p>
            <span>{draftType === 'snake' ? 'SNAKE DRAFT' : 'LINEAR DRAFT'}</span>
          </div>
        </div>
      </section>

      <div className="draft-grid">
        <section className="draft-feed">
          <h2>
            <span className="material-symbols-outlined">history</span>
            Recent Activity
          </h2>
          <div className="space-y-3">
            {queuedPlayers.map((player) => (
              <article key={player.name} className="activity-card">
                <span>{String(player.rank).padStart(2, '0')}</span>
                <div>
                  <p>{player.name}</p>
                  <small>{player.team}</small>
                </div>
              </article>
            ))}
            <article className="activity-card pending">
              <span>04</span>
              <div className="h-4 w-24 bg-surface-container-highest/50 rounded animate-pulse" />
              <strong>YOU</strong>
            </article>
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
