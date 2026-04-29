import type { AppRoute } from './useHashRoute'
import { useHashRoute } from './useHashRoute'
import { DraftPage } from './pages/DraftPage'
import { HomePage } from './pages/HomePage'
import { StandingsPage } from './pages/StandingsPage'
import { TeamPage } from './pages/TeamPage'
import './App.css'

const topNav: { route: AppRoute; label: string }[] = [
  { route: 'draft', label: 'Draft Room' },
  { route: 'standings', label: 'League' },
  { route: 'team', label: 'Roster' },
]

const sideNav: { route: AppRoute; label: string; icon: string }[] = [
  { route: 'draft', label: 'War Room', icon: 'strategy' },
  { route: 'team', label: 'Scouting', icon: 'person_search' },
  { route: 'standings', label: 'Standings', icon: 'leaderboard' },
  { route: 'team', label: 'Cap Space', icon: 'payments' },
]

function App() {
  const [route, navigate] = useHashRoute()
  const showSidebar = route !== 'home'
  const activeSideLabel =
    route === 'draft' ? 'War Room' : route === 'team' ? 'Scouting' : 'Standings'

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
          <nav className="hidden md:flex gap-8 items-center font-headline font-bold uppercase tracking-tighter" aria-label="Main">
            {topNav.map(({ route: itemRoute, label }) => (
              <button
                key={itemRoute}
                type="button"
                className={route === itemRoute ? 'top-nav-link active' : 'top-nav-link'}
                onClick={() => navigate(itemRoute)}
                aria-current={route === itemRoute ? 'page' : undefined}
              >
                {label}
              </button>
            ))}
            <button type="button" className="top-nav-link" onClick={() => navigate('team')}>
              Trades
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button type="button" className="material-symbols-outlined header-icon" aria-label="Analytics">
            analytics
          </button>
          <button type="button" className="material-symbols-outlined header-icon" aria-label="Notifications">
            notifications
          </button>
          <div className="avatar-orb" aria-label="Executive profile">
            GM
          </div>
        </div>
      </header>

      <div className={showSidebar ? 'app-shell with-sidebar' : 'app-shell'}>
        {showSidebar && (
          <aside className="side-nav" aria-label="Front office navigation">
            <div className="px-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="side-avatar">
                  <span className="material-symbols-outlined text-primary-container">strategy</span>
                </div>
                <div>
                  <p className="font-headline text-primary-container font-bold">Front Office</p>
                  <p className="text-xs text-slate-500 font-label">Elite Executive</p>
                </div>
              </div>
            </div>

            <nav className="flex-grow space-y-1">
              {sideNav.map(({ route: itemRoute, label, icon }) => (
                <button
                  key={`${label}-${itemRoute}`}
                  type="button"
                  className={label === activeSideLabel ? 'side-nav-link active' : 'side-nav-link'}
                  onClick={() => navigate(itemRoute)}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                  {label}
                </button>
              ))}
              <button type="button" className="side-nav-link" onClick={() => navigate('home')}>
                <span className="material-symbols-outlined">home</span>
                Home
              </button>
            </nav>

            <div className="px-4 mt-auto">
              <button type="button" className="start-draft-button" onClick={() => navigate('draft')}>
                START DRAFT
              </button>
            </div>
          </aside>
        )}

        <main id="main" className={showSidebar ? 'app-main' : 'app-main home-main'}>
          {route === 'home' && <HomePage />}
          {route === 'draft' && <DraftPage />}
          {route === 'team' && <TeamPage />}
          {route === 'standings' && <StandingsPage />}
        </main>
      </div>
    </div>
  )
}

export default App
