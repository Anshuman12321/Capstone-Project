import type { AppRoute } from './useHashRoute'
import { useHashRoute } from './useHashRoute'
import { useApp } from './AppState'

import { LoginView } from './components/LoginView'
import { LobbyView } from './components/LobbyView'

import { DraftPage } from './pages/DraftPage'
import { HomePage } from './pages/HomePage'
import { StandingsPage } from './pages/StandingsPage'
import { TeamPage } from './pages/TeamPage'

import './App.css'

const nav: { route: AppRoute; label: string }[] = [
  { route: 'home', label: 'Lobby' },
  { route: 'draft', label: 'Draft' },
  { route: 'team', label: 'My team' },
  { route: 'standings', label: 'Standings' },
]

export default function App() {
  const { user, game, toast, setUser, setGame, setTeam } = useApp()
  const [route, navigate] = useHashRoute()

  const handleLogout = () => {
    setUser(null);
    setGame(null);
    setTeam(null);
  };

  const handleBackToLobby = () => {
    setGame(null);
    setTeam(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => { if (user && game) handleBackToLobby() }}>
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <span className="brand-title">Fantasy Hoops</span>
            <span className="brand-sub">Capstone</span>
          </div>
        </div>

        {user && game && (
          <nav className="main-nav" aria-label="Main">
            <ul>
              {nav.map(({ route: r, label }) => (
                <li key={r}>
                  <button
                    type="button"
                    className={route === r ? 'nav-link active' : 'nav-link'}
                    onClick={() => navigate(r)}
                    aria-current={route === r ? 'page' : undefined}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="top-actions">
          {user && game && (
            <button className="btn-secondary" style={{ marginRight: '1rem' }} onClick={handleBackToLobby}>
              Home
            </button>
          )}
          {user && (
            <button className="btn-ghost" onClick={handleLogout}>
              Logout ({user.username})
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}

      <main className="app-main">
        {!user && <LoginView />}
        {user && !game && <LobbyView />}

        {user && game && (
          <>
            {route === 'home' && <HomePage />}
            {route === 'draft' && <DraftPage />}
            {route === 'team' && <TeamPage />}
            {route === 'standings' && <StandingsPage />}
          </>
        )}
      </main>
    </div>
  )
}
