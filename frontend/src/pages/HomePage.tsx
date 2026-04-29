import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

type HelloResponse = { message: string }

export function HomePage() {
  const [data, setData] = useState<HelloResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(apiUrl('/api/hello'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<HelloResponse>
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Request failed')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-art" aria-hidden="true">
          <img
            alt=""
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYh29D8bL_n8HEBpDdo3l7_cmKcPXS5XEBuG5N_AFkSx_2TXtCct-syv-31X4YA5wYxPkK97BQKXax6KEIbxd-uwHYYO32Pl8gQeGBeQ0BuAMNFCl_IdKgVMGEfvNbhGRCHTWlS0FOKNmhRuaAhwe8SKy4a5-mf3Pgw-YeZLJzZFHhP0zD7ZQMjE7CsqPXAyEHsopBgXDI8S9czNCSq7wOvnJ1QLYBhZ-mbynT0S7zllXUP2GLhDjD2ARo6Ks5jm7_i1NzexyhM-4"
          />
        </div>
        <div className="relative z-10 max-w-4xl">
          <span className="section-kicker">The Digital Front Office</span>
          <h1 className="hero-title">
            Build Your <br />
            <span className="stroke-text text-transparent">Dynasty</span>
          </h1>
          <p className="hero-copy">
            Step into the war room. Experience a sophisticated fantasy basketball front-office
            simulation built for draft strategy, roster control, and league dominance.
          </p>
          <div className="flex flex-wrap gap-4">
            <a className="primary-cta" href="#/draft">
              Join League
            </a>
            <a className="glass-cta" href="#/standings">
              View Demo
            </a>
          </div>
          <div className="backend-card glass-panel">
            <span className="material-symbols-outlined text-primary-container">dns</span>
            {loading && <p>Checking FastAPI backend...</p>}
            {!loading && error && <p>Backend unavailable: {error}</p>}
            {!loading && !error && data && (
              <p>
                Backend connected: <code>/api/hello</code> returned {data.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="bento-grid">
          <article className="bento-card bento-large glass-panel">
            <div>
              <span className="material-symbols-outlined material-symbols-filled feature-icon">strategy</span>
              <h2>Real-Time War Room</h2>
              <p>
                Draft tools, queue decisions, and live board context come together in a high-fidelity
                scouting interface for every owner.
              </p>
            </div>
            <img
              alt="Draft data interface"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGilmpkbK3m94bi-Nw9vyumFLUJZB9AVXGU-qPyCizor87VydMKuzaTFN3J_pcjtRRp18CWEsz6gaIpZvs6RLzoH2O7vpZ7mkqfOubM11HuWNl9utHT_WNIWruxrTpJz3yCHKTbgkIPXPEH_glSg6RCLqQY9HxbzMh7jqFFGyN_W_heU4gW07UpSo29wvtdzRGk7lmOJ1N9Lr2uSx_vMhERTPZza1H7yTk6zLjvf_GZxQs_Q9QiYMLYtD3T8BteXrQo-H8aipY1K4"
            />
          </article>
          <article className="bento-card bg-surface-container-high">
            <span className="material-symbols-outlined watermark-icon">leaderboard</span>
            <h3>Live Standings</h3>
            <p>Track rankings, records, streaks, and points for after every matchup.</p>
          </article>
          <article className="bento-card bg-surface-container-highest">
            <span className="material-symbols-outlined watermark-icon">payments</span>
            <h3>Roster Mastery</h3>
            <p>Manage the rotation, evaluate projected output, and shape your next move.</p>
          </article>
        </div>
      </section>

      <section className="editorial-section">
        <div className="editorial-image">
          <img
            alt="Executive draft room"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-EYDOcAb6YtdFyoGzoruD08nMlKhgJ8_ep2docGdAQZzybSCcuJAT2zPNwT8kjAFQ9TbNurcOmK04qLz0rd6GEQPL-CfnP6KOuCy1FN4OIQOrg4B1yIqeu6MZXznL7c2iJ27T0XZWsff8ceIdPRDn5Ecev1XZu23SIa_5S6uBDwvvrkoFAKeAO6f0IPhhVJfRR08CI-sVA9hvTGfEezEcl_TMqd3RpSOLIkraOz4FgrTeWTZ59WcMbtYWuoSxw8eQjT_13IF7W24"
          />
        </div>
        <div>
          <h2>
            More Than A Game. <br />A Professional Grade{' '}
            <span className="text-primary-container underline decoration-2 underline-offset-8">
              Simulation
            </span>
            .
          </h2>
          <div className="editorial-list">
            {[
              ['01', 'Precision Scouting', 'Compare positions, projected totals, and league fit before every pick.'],
              ['02', 'Draft Control', 'Tune draft format, round count, and clock speed without leaving the war room.'],
              ['03', 'Executive Social', 'Compete with friends in a league interface built around rivalry and prestige.'],
            ].map(([num, title, copy]) => (
              <article key={num} className="editorial-item">
                <span>{num}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2>
          Ready to Take <span>Control</span>?
        </h2>
        <p>The next draft starts soon. Secure your franchise spot and begin your legacy.</p>
        <a href="#/draft">
          <span>Start Your Franchise</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </a>
      </section>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <a href="#/draft">
          <span className="material-symbols-outlined">strategy</span>
          Draft
        </a>
        <a href="#/standings">
          <span className="material-symbols-outlined">leaderboard</span>
          League
        </a>
        <a href="#/team">
          <span className="material-symbols-outlined">groups</span>
          Team
        </a>
      </nav>
    </div>
  )
}
