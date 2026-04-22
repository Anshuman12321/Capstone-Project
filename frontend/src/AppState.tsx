import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Game {
    game_id: string;
    name: string;
    owner_user_id: string;
    current_week: number;
    status: string;
    settings: {
        max_teams: number;
        roster_limit: number;
    };
    teams_by_user_id: Record<string, Team>;
    standings: Record<string, number>;
}

interface User {
    user_id: string;
    username: string;
    game_ids: string[];
}

interface Team {
    team_id: string;
    name: string;
    owner_user_id: string;
    roster_player_ids: string[];
}

interface Toast {
    message: string;
    type: 'error' | 'success';
}

interface AppState {
    user: User | null;
    game: Game | null;
    team: Team | null;
    toast: Toast | null;
    setUser: (user: User | null) => void;
    setGame: (game: Game | null) => void;
    setTeam: (team: Team | null) => void;
    showToast: (message: string, type?: 'error' | 'success') => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [game, setGame] = useState<Game | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    return (
        <AppContext.Provider value={{ user, game, team, toast, setUser, setGame, setTeam, showToast }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
