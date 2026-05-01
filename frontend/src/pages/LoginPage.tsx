import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiUrl } from '../lib/api'

type User = {
  user_id: string
  username: string
  game_ids?: string[]
}

type LoginPageProps = {
  onLogin: (user: User) => void
  onCancel: () => void
  requireAuthMessage?: string
}

export function LoginPage({ onLogin, onCancel, requireAuthMessage }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requireUsername = (): string | null => {
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Enter your GM username.')
      return null
    }
    return trimmed
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = requireUsername()
    if (!trimmed) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const encoded = encodeURIComponent(trimmed)
      const res = await fetch(apiUrl(`/api/users/by-username/${encoded}`))
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('No GM account matches that username.')
        }
        throw new Error(`Login failed (HTTP ${res.status})`)
      }
      const user = (await res.json()) as User
      onLogin(user)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async () => {
    const trimmed = requireUsername()
    if (!trimmed) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      })
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('That username is already taken. Try logging in instead.')
        }
        throw new Error(`Create account failed (HTTP ${res.status})`)
      }
      const user = (await res.json()) as User
      onLogin(user)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create account failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-panel glass-panel">
        <p className="section-kicker">Join League</p>
        <h1>GM Login</h1>
        {requireAuthMessage && <p className="login-required">{requireAuthMessage}</p>}
        <p>Use your unique general manager username to enter the league.</p>

        <form onSubmit={handleLogin} className="login-form">
          <label htmlFor="gm-username">Username</label>
          <input
            id="gm-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. jwil_gm"
            autoComplete="username"
          />
          {error && <p className="login-error">{error}</p>}
          <div className="flex flex-wrap gap-4">
            <button type="submit" className="primary-cta compact" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Enter League'}
            </button>
            <button type="button" className="glass-cta compact" onClick={handleCreate} disabled={submitting}>
              Create Account
            </button>
            <button type="button" className="glass-cta compact" onClick={onCancel}>
              Back
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
