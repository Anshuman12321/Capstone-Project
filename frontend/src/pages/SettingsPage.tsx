import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import type { AuthUser } from '../types'

type Game = {
  game_id: string
  name: string
  owner_user_id: string | null
  user_ids: string[]
}

type Member = {
  user_id: string
  username: string
}

type SettingsPageProps = {
  user: AuthUser
  game: Game
  onLeftLeague: () => void
  onDeletedLeague: () => void
}

export function SettingsPage({ user, game, onLeftLeague, onDeletedLeague }: SettingsPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [kickingUserId, setKickingUserId] = useState<string | null>(null)
  const isOwner = game.owner_user_id === user.user_id

  useEffect(() => {
    let active = true
    const loadMembers = async () => {
      try {
        const records = await Promise.all(
          game.user_ids.map(async (id) => {
            const res = await fetch(apiUrl(`/api/users/${id}`))
            if (!res.ok) return null
            return (await res.json()) as Member
          }),
        )
        if (active) {
          setMembers(records.filter((m): m is Member => Boolean(m)))
        }
      } catch {
        if (active) setMembers([])
      }
    }
    void loadMembers()
    return () => {
      active = false
    }
  }, [game.user_ids])

  const handleLeaveGame = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/games/${game.game_id}/leave`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      })
      if (!res.ok) throw new Error(`Failed to leave league (HTTP ${res.status})`)
      onLeftLeague()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to leave league')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLeague = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/games/${game.game_id}/delete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      })
      if (!res.ok) throw new Error(`Failed to delete league (HTTP ${res.status})`)
      setShowDeleteConfirm(false)
      onDeletedLeague()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete league')
    } finally {
      setLoading(false)
    }
  }

  const handleKick = async (targetUserId: string) => {
    setKickingUserId(targetUserId)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/games/${game.game_id}/kick`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_user_id: user.user_id, target_user_id: targetUserId }),
      })
      if (!res.ok) throw new Error(`Failed to remove player (HTTP ${res.status})`)
      setMembers((prev) => prev.filter((member) => member.user_id !== targetUserId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove player')
    } finally {
      setKickingUserId(null)
    }
  }

  return (
    <section className="settings-page space-y-6">
      <div className="glass-panel settings-card">
        <h1>League Settings</h1>
        <p className="settings-subtle">League: {game.name}</p>
        <p className="settings-subtle">League ID: {game.game_id}</p>
      </div>

      {error && <p className="login-error">{error}</p>}

      <div className="glass-panel settings-card settings-actions">
        {isOwner && (
          <button type="button" className="glass-cta compact" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
            Delete League
          </button>
        )}
        {!isOwner && (
          <button type="button" className="primary-cta compact" onClick={handleLeaveGame} disabled={loading}>
            {loading ? 'Working...' : 'Leave League'}
          </button>
        )}
      </div>

      {isOwner && (
        <div className="glass-panel settings-card">
          <h2>Manage Players</h2>
          <div className="settings-member-list">
            {members.map((member) => (
              <div key={member.user_id} className="settings-member-row">
                <div>
                  <p>{member.username}</p>
                  <small>{member.user_id === user.user_id ? 'Owner' : 'Member'}</small>
                </div>
                {member.user_id !== user.user_id && (
                  <button
                    type="button"
                    className="glass-cta compact"
                    onClick={() => handleKick(member.user_id)}
                    disabled={kickingUserId === member.user_id}
                  >
                    {kickingUserId === member.user_id ? 'Removing...' : 'Kick'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="games-modal-backdrop" role="presentation" onClick={() => setShowDeleteConfirm(false)}>
          <div className="games-modal glass-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="games-modal-close" onClick={() => setShowDeleteConfirm(false)} aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2>Delete League?</h2>
            <p>This permanently removes the league for all managers. Are you sure?</p>
            <div className="flex gap-3">
              <button type="button" className="primary-cta compact" onClick={handleDeleteLeague} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button type="button" className="glass-cta compact" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
