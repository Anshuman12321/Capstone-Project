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
    <div className="page">
      <header className="page-header">
        <h1>Fantasy League</h1>
        <p className="lede">
          Welcome to BananaBall Fantasy League Simulator, where you can play a simualted game of Fantasy Basketball with your Friends!
        </p>
      </header>

      <section>
        {loading && <p className="muted">Checking backend…</p>}
        {!loading && error && (
          <p className="error-msg">

          </p>
        )}
        {!loading && !error && data && (
          <p className="ok-msg">
            <code>/api/hello</code> → {data.message}
          </p>
        )}
      </section>
    </div>
  )
}
