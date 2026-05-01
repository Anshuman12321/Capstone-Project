import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import type { AuthUser } from '../types'

type Game = {
  game_id: string
  name: string
  status: 'lobby' | 'drafting' | 'in_progress' | 'completed'
  owner_user_id: string | null
  user_ids: string[]
}

type GamesPageProps = {
  user: AuthUser
  onSelectGame: (gameId: string) => void
  onGamesChanged?: () => void
}

export function GamesPage({ user, onSelectGame, onGamesChanged }: GamesPageProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [gameName, setGameName] = useState('')
  const [joinGameId, setJoinGameId] = useState('')

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/users/${user.user_id}/games`))
      if (!res.ok) throw new Error(`Failed to load games (HTTP ${res.status})`)
      const mine = (await res.json()) as Game[]
      setGames(mine)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load games')
    } finally {
      setLoading(false)
    }
  }, [user.user_id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadGames()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadGames])

  const closeModal = () => {
    setModal(null)
    setGameName('')
    setJoinGameId('')
  }

  const handleCreateGame = async () => {
    const trimmedName = gameName.trim()
    if (!trimmedName) {
      setError('Game name is required.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const createRes = await fetch(apiUrl('/api/games'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_user_id: user.user_id, name: trimmedName }),
      })
      if (!createRes.ok) throw new Error(`Failed to create game (HTTP ${createRes.status})`)
      const created = (await createRes.json()) as Game

      const joinRes = await fetch(apiUrl(`/api/games/${created.game_id}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      })
      if (!joinRes.ok) throw new Error(`Failed to join game (HTTP ${joinRes.status})`)
      closeModal()
      onGamesChanged?.()
      onSelectGame(created.game_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create game failed')
    } finally {
      setCreating(false)
      void loadGames()
    }
  }

  const handleJoinGame = async () => {
    const gameId = joinGameId.trim()
    if (!gameId) {
      setError('Game ID is required.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const joinRes = await fetch(apiUrl(`/api/games/${gameId}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      })
      if (!joinRes.ok) {
        if (joinRes.status === 404) {
          throw new Error('Game not found for that ID.')
        }
        throw new Error(`Failed to join game (HTTP ${joinRes.status})`)
      }
      closeModal()
      onGamesChanged?.()
      onSelectGame(gameId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Join game failed')
    } finally {
      setCreating(false)
      void loadGames()
    }
  }

  return (
    <section className="games-page space-y-6">
      <div className="games-header">
        <div>
          <p className="section-kicker">Your Leagues</p>
          <h1>Games</h1>
          <p>Create a game or jump back into one of your active leagues.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="glass-cta compact"
            onClick={() => {
              setError(null)
              setModal('join')
            }}
            disabled={creating}
          >
            Join Game
          </button>
          <button
            type="button"
            className="primary-cta compact"
            onClick={() => {
              setError(null)
              setModal('create')
            }}
            disabled={creating}
          >
            {creating ? 'Working...' : 'Create Game'}
          </button>
        </div>
      </div>

      {error && <p className="login-error">{error}</p>}
      {loading && <p>Loading your games...</p>}

      {!loading && games.length === 0 && (
        <div className="glass-panel games-empty">
          <p>No games yet. Create your first league to get started.</p>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div className="games-list">
          {games.map((game) => (
            <article key={game.game_id} className="glass-panel game-card">
              <div>
                <h2>{game.name}</h2>
                <p>Status: {game.status.replace('_', ' ')}</p>
                <small>{game.user_ids.length} member(s)</small>
              </div>
              <button type="button" className="glass-cta compact" onClick={() => onSelectGame(game.game_id)}>
                Open
              </button>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <div className="games-modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="games-modal glass-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="games-modal-close" onClick={closeModal} aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>

            {modal === 'create' && (
              <>
                <h2>Create Game</h2>
                <p>Name your new league. You can add more game options here later.</p>
                <label htmlFor="create-game-name">Game Name</label>
                <input
                  id="create-game-name"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="My League"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button type="button" className="primary-cta compact" onClick={handleCreateGame} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" className="glass-cta compact" onClick={closeModal} disabled={creating}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modal === 'join' && (
              <>
                <h2>Join Game</h2>
                <p>Enter a game ID from another manager to join their league.</p>
                <label htmlFor="join-game-id">Game ID</label>
                <input
                  id="join-game-id"
                  value={joinGameId}
                  onChange={(e) => setJoinGameId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button type="button" className="primary-cta compact" onClick={handleJoinGame} disabled={creating}>
                    {creating ? 'Joining...' : 'Join'}
                  </button>
                  <button type="button" className="glass-cta compact" onClick={closeModal} disabled={creating}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
