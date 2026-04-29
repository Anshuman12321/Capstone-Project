import { bench, starters } from '../mockData'

export function TeamPage() {
  const captain = starters[0]
  const rotation = [...starters.slice(1), ...bench]

  return (
    <div className="team-page">
      <section className="team-hero">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1>Active Roster</h1>
            <p>
              Analyzing the season&apos;s core performance. Your executive decisions today define
              the franchise&apos;s legacy tomorrow.
            </p>
          </div>
          <div className="flex gap-4">
            <button type="button" className="primary-cta compact">
              Initiate Trade
            </button>
            <button type="button" className="glass-cta compact">
              Waivers
            </button>
          </div>
        </div>
      </section>

      <div className="team-grid">
        {captain && (
          <article className="captain-card">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <span className="captain-pill">Captain</span>
                  <h2>{captain.player}</h2>
                  <p>
                    {captain.pos} | {captain.nbaTeam} | MVP Candidate
                  </p>
                </div>
                <div className="text-right">
                  <strong>{captain.proj?.toFixed(1)}</strong>
                  <small>Projection Index</small>
                </div>
              </div>
              <div className="stat-grid">
                <div>
                  <span>SLOT</span>
                  <strong>{captain.slot}</strong>
                </div>
                <div>
                  <span>POS</span>
                  <strong>{captain.pos}</strong>
                </div>
                <div>
                  <span>TEAM</span>
                  <strong>{captain.nbaTeam}</strong>
                </div>
                <div>
                  <span>PROJ</span>
                  <strong>{captain.proj?.toFixed(1)}</strong>
                </div>
              </div>
            </div>
            <img
              alt=""
              aria-hidden="true"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlb-x-59VzFO19cVlbBCYsUxdvWILjQYV73PmpAqidEL9wwiGfGkfRHvxcDb_mDXgPC-ATL5JzzIBz_wWvpULll37ymmtnjmczwktYzC7hI0GdUarJxdS-86-hNR2b9aIzBB0bmKa8nGog9hyjAPNDPYPXPp4PoghmPD6w1F2btt1QPJXSKGMR7dP8tNgXC2xZG25ZBi2oyl9wOo1ypVBB_008Se91rXoILCfQmx9vh2O6JmfVBIDH4gSice3g-M93Y35cjvOv-B8"
            />
          </article>
        )}

        <aside className="transaction-card">
          <h2>
            <span className="material-symbols-outlined">history</span>
            Transaction Log
          </h2>
          <div className="space-y-4">
            <article>
              <small>Yesterday</small>
              <p>
                <strong>Trade Complete:</strong> Sent a bench asset to The Outlaws.
              </p>
            </article>
            <article>
              <small>3 Days Ago</small>
              <p>
                <strong>Waiver Pickup:</strong> Added {bench[0]?.player ?? 'bench depth'}.
              </p>
            </article>
            <article>
              <small>May 12</small>
              <p>
                <strong>Lineup Locked:</strong> Starters confirmed for this week.
              </p>
            </article>
          </div>
          <button type="button">View Full Archive</button>
        </aside>

        <section className="rotation-section">
          <div className="section-head">
            <h2>Full Rotation</h2>
            <span>Midnight Blitz · 9-2 · #1 in standings</span>
          </div>
          <div className="rotation-grid">
            {rotation.map((row) => (
              <article key={`${row.slot}-${row.player}`} className="player-card">
                <div className="flex justify-between items-center mb-6">
                  <div className="player-orb">
                    <span className="material-symbols-outlined">sports_basketball</span>
                  </div>
                  <div className="text-right">
                    <h3>{row.player}</h3>
                    <p>
                      {row.pos} | {row.slot}
                    </p>
                  </div>
                </div>
                <div className="player-card-stats">
                  <div>
                    <span>NBA</span>
                    <strong>{row.nbaTeam}</strong>
                  </div>
                  <div>
                    <span>PROJ</span>
                    <strong>{row.proj?.toFixed(1) ?? '-'}</strong>
                  </div>
                  <div>
                    <span>POS</span>
                    <strong>{row.pos}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
