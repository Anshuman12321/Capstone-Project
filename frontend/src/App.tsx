import type { AppRoute } from './useHashRoute'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl } from './lib/api'
import { useHashRoute } from './useHashRoute'
import { CapSpacePage } from './pages/CapSpacePage'
import { DraftPage } from './pages/DraftPage'
import { GamesPage } from './pages/GamesPage'
import { HomePage } from './pages/HomePage'
import { authStorage } from './lib/storage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { StandingsPage } from './pages/StandingsPage'
import { TeamPage } from './pages/TeamPage'
import type { AuthUser, Game } from './types'
import './App.css'

const sideNav: { route: AppRoute; label: string; icon: string }[] = [
  { route: 'draft', label: 'Dashboard', icon: 'dashboard' },
  { route: 'team', label: 'Scouting', icon: 'person_search' },
  { route: 'standings', label: 'Standings', icon: 'leaderboard' },
  { route: 'cap-space', label: 'Cap Space', icon: 'payments' },
  { route: 'settings', label: 'Settings', icon: 'settings' },
]

function App() {
  const [route, navigate] = useHashRoute()
  const [user, setUser] = useState<AuthUser | null>(() => {
    const existing = authStorage.getItem('gm_user')
    if (!existing) return null
    try {
      return JSON.parse(existing) as AuthUser
    } catch {
      authStorage.removeItem('gm_user')
      return null
    }
  })
  const [userGames, setUserGames] = useState<Game[]>([])
  const [activeGameId, setActiveGameId] = useState<string | null>(() => authStorage.getItem('active_game_id'))
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false)
  const [officeOpen, setOfficeOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 'n1', text: 'League invite pending from Midtown Ballers.' },
    { id: 'n2', text: 'Trade window opens in 3 hours.' },
    { id: 'n3', text: 'Your next draft pick is projected at #14.' },
    { id: 'n4', text: 'Commissioner posted a new league announcement.' },
  ])
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const officeMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null)
  const isLoggedIn = Boolean(user)
  const isProtectedRoute =
    route === 'draft' || route === 'team' || route === 'standings' || route === 'cap-space' || route === 'settings'
  const hasActiveGame = Boolean(activeGameId)
  const activeGame = userGames.find((game) => game.game_id === activeGameId) ?? null
  const showSidebar = isLoggedIn && hasActiveGame && route !== 'home' && route !== 'login' && route !== 'games'
  const activeSideLabel =
    route === 'draft'
      ? 'Dashboard'
      : route === 'team'
        ? 'Scouting'
        : route === 'standings'
          ? 'Standings'
          : route === 'cap-space'
            ? 'Cap Space'
            : 'Settings'
  const gmInitials = useMemo(() => {
    if (!user) return 'GM'
    return user.username
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'GM'
  }, [user])

  const loadUserGames = useCallback(async (authUser: AuthUser) => {
    const res = await fetch(apiUrl(`/api/users/${authUser.user_id}/games`))
    if (!res.ok) return
    const mine = (await res.json()) as Game[]
    setUserGames(mine)
    if (activeGameId && !mine.some((game) => game.game_id === activeGameId)) {
      authStorage.removeItem('active_game_id')
      setActiveGameId(null)
    }
  }, [activeGameId])

  useEffect(() => {
    if (!user) return undefined
    const timeout = window.setTimeout(() => {
      void loadUserGames(user)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadUserGames, user])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    void (async () => {
      const res = await fetch(apiUrl(`/api/users/${user.user_id}`))
      if (!res.ok || cancelled) return
      const full = (await res.json()) as AuthUser
      const next: AuthUser = {
        user_id: full.user_id,
        username: full.username,
        game_ids: full.game_ids ?? [],
      }
      if (cancelled) return
      setUser(next)
      authStorage.setItem('gm_user', JSON.stringify(next))
    })()
    return () => {
      cancelled = true
    }
  }, [user?.user_id])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
      if (!officeMenuRef.current) return
      if (!officeMenuRef.current.contains(event.target as Node)) {
        setOfficeOpen(false)
      }
      if (!notificationsMenuRef.current) return
      if (!notificationsMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [])

  const handleProtectedNavigate = (targetRoute: AppRoute) => {
    if (!isLoggedIn) {
      navigate('home')
      return
    }
    if (targetRoute !== 'games' && !hasActiveGame) {
      navigate('games')
      return
    }
    navigate(targetRoute)
  }

  const gameStatusLabel = (game: Game): string => {
    if (game.status === 'lobby') return 'Lobby'
    return `Week ${Math.max(1, game.current_week)}`
  }

  const handleGameUpdated = (updatedGame: Game) => {
    setUserGames((prev) => prev.map((game) => (game.game_id === updatedGame.game_id ? updatedGame : game)))
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-label selection:bg-primary-container selection:text-on-primary-container">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="app-header">
        <div className="flex items-center gap-8 lg:gap-12">
          <button type="button" className="brand-wordmark" onClick={() => navigate('home')}>
            BananaBall
          </button>
          <nav className="hidden md:flex gap-4 items-center font-headline font-bold uppercase tracking-tighter" aria-label="Main">
            {isLoggedIn && (
              <>
                <button
                  type="button"
                  className={route === 'draft' ? 'top-nav-link active' : 'top-nav-link'}
                  onClick={() => handleProtectedNavigate('draft')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className={route === 'games' ? 'top-nav-link active' : 'top-nav-link'}
                  onClick={() => navigate('games')}
                >
                  View Leagues
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="notifications-menu" ref={notificationsMenuRef}>
            <button
              type="button"
              className="material-symbols-outlined header-icon"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              notifications
            </button>
            {notificationsOpen && (
              <div className="notifications-dropdown" role="dialog" aria-label="Notifications">
                <div className="notifications-header">
                  <p>Notifications</p>
                  <span>{notifications.length}</span>
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 && <p className="notifications-empty">No new notifications.</p>}
                  {notifications.map((item) => (
                    <article key={item.id} className="notification-item">
                      <p>{item.text}</p>
                      <button
                        type="button"
                        aria-label="Delete notification"
                        onClick={() => setNotifications((prev) => prev.filter((existing) => existing.id !== item.id))}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="profile-menu" ref={profileMenuRef}>
            {!isLoggedIn ? (
              <button type="button" className="glass-cta compact" onClick={() => navigate('login')}>
                Login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="avatar-orb"
                  aria-label="Executive profile menu"
                  onClick={() => setProfileOpen((prev) => !prev)}
                >
                  {gmInitials}
                </button>
                {profileOpen && (
                  <div className="profile-dropdown">
                    <p className="profile-name">{user?.username ?? 'Account'}</p>
                    <button
                      type="button"
                      onClick={() => {
                        authStorage.removeItem('gm_user')
                        authStorage.removeItem('active_game_id')
                        setUser(null)
                        setActiveGameId(null)
                        setProfileOpen(false)
                        setDeleteAccountConfirm(false)
                        navigate('home')
                      }}
                    >
                      Log out
                    </button>
                    {!deleteAccountConfirm ? (
                      <button
                        type="button"
                        className="profile-danger"
                        onClick={() => setDeleteAccountConfirm(true)}
                      >
                        Delete account
                      </button>
                    ) : (
                      <div className="profile-delete-confirm">
                        <p className="profile-delete-warning">Delete forever? This removes your leagues membership and account data.</p>
                        <div className="profile-delete-actions">
                          <button
                            type="button"
                            className="profile-danger-solid"
                            onClick={async () => {
                              if (!user) return
                              try {
                                const res = await fetch(apiUrl(`/api/users/${user.user_id}`), { method: 'DELETE' })
                                if (!res.ok) {
                                  throw new Error(`Delete failed (HTTP ${res.status})`)
                                }
                                authStorage.removeItem('gm_user')
                                authStorage.removeItem('active_game_id')
                                setUserGames([])
                                setUser(null)
                                setActiveGameId(null)
                                setProfileOpen(false)
                                setDeleteAccountConfirm(false)
                                navigate('home')
                              } catch {
                                setDeleteAccountConfirm(false)
                              }
                            }}
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            className="glass-cta compact"
                            onClick={() => setDeleteAccountConfirm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <div className={showSidebar ? 'app-shell with-sidebar' : 'app-shell'}>
        {showSidebar && (
          <aside className="side-nav" aria-label="Front office navigation">
            <div className="px-6 mb-8">
              <div className="front-office-menu" ref={officeMenuRef}>
                <button type="button" className="front-office-trigger" onClick={() => setOfficeOpen((prev) => !prev)}>
                  <div className="side-avatar">
                    <span className="material-symbols-outlined text-primary-container">strategy</span>
                  </div>
                  <div>
                    <p className="font-headline text-primary-container font-bold">{activeGame?.name ?? 'Front Office'}</p>
                    <p className="text-xs text-slate-500 font-label">Elite Executive</p>
                  </div>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                {officeOpen && (
                  <div className="front-office-dropdown">
                    <p>Your Leagues</p>
                    <div className="front-office-list">
                      {userGames.map((game) => (
                        <button
                          key={game.game_id}
                          type="button"
                          className={activeGameId === game.game_id ? 'active' : ''}
                          onClick={() => {
                            authStorage.setItem('active_game_id', game.game_id)
                            setActiveGameId(game.game_id)
                            setOfficeOpen(false)
                            navigate('draft')
                          }}
                        >
                          <span className="league-name">{game.name}</span>
                          <span className="league-meta">{gameStatusLabel(game)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <nav className="flex-grow space-y-1">
              {sideNav.map(({ route: itemRoute, label, icon }) => (
                <button
                  key={`${label}-${itemRoute}`}
                  type="button"
                  className={label === activeSideLabel ? 'side-nav-link active' : 'side-nav-link'}
                  onClick={() => handleProtectedNavigate(itemRoute)}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                  {label}
                </button>
              ))}
            </nav>

            <div className="px-4 mt-auto">
              <button type="button" className="start-draft-button" onClick={() => handleProtectedNavigate('draft')}>
                DASHBOARD
              </button>
            </div>
          </aside>
        )}

        <main id="main" className={showSidebar ? 'app-main' : 'app-main home-main'}>
          {route === 'home' && <HomePage />}
          {route === 'login' && (
            <LoginPage
              onLogin={(nextUser) => {
                authStorage.setItem('gm_user', JSON.stringify(nextUser))
                setUser(nextUser)
                void loadUserGames(nextUser)
                navigate('games')
              }}
              onCancel={() => navigate('home')}
            />
          )}
          {isLoggedIn && route === 'games' && user && (
            <GamesPage
              user={user}
              onGamesChanged={() => void loadUserGames(user)}
              onSelectGame={(gameId) => {
                authStorage.setItem('active_game_id', gameId)
                setActiveGameId(gameId)
                navigate('draft')
              }}
            />
          )}
          {!isLoggedIn && route === 'games' && (
            <LoginPage
              requireAuthMessage="Log in to access your leagues."
              onLogin={(nextUser) => {
                authStorage.setItem('gm_user', JSON.stringify(nextUser))
                setUser(nextUser)
                void loadUserGames(nextUser)
                navigate('games')
              }}
              onCancel={() => navigate('home')}
            />
          )}
          {!isLoggedIn && isProtectedRoute && (
            <HomePage />
          )}
          {isLoggedIn && !hasActiveGame && isProtectedRoute && user && (
            <GamesPage
              user={user}
              onGamesChanged={() => void loadUserGames(user)}
              onSelectGame={(gameId) => {
                authStorage.setItem('active_game_id', gameId)
                setActiveGameId(gameId)
                navigate('draft')
              }}
            />
          )}
          {isLoggedIn && hasActiveGame && route === 'draft' && activeGame && user && (
            <DraftPage activeGame={activeGame} user={user} onGameUpdated={handleGameUpdated} />
          )}
          {isLoggedIn && hasActiveGame && route === 'team' && <TeamPage />}
          {isLoggedIn && hasActiveGame && route === 'standings' && activeGame && (
            <StandingsPage activeGame={activeGame} user={user} />
          )}
          {isLoggedIn && hasActiveGame && route === 'cap-space' && <CapSpacePage />}
          {isLoggedIn && hasActiveGame && route === 'settings' && user && activeGame && (
            <SettingsPage
              user={user}
              game={activeGame}
              onLeftLeague={() => {
                authStorage.removeItem('active_game_id')
                setActiveGameId(null)
                void loadUserGames(user)
                navigate('games')
              }}
              onDeletedLeague={() => {
                authStorage.removeItem('active_game_id')
                setActiveGameId(null)
                void loadUserGames(user)
                navigate('games')
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
