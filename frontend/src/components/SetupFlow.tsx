import { useState } from 'react';
import { useApp } from '../AppState';
import { draftBoard } from '../mockData';

export function SetupFlow() {
    const { setUser, setGame, setTeam } = useApp();
    const [username, setUsername] = useState('');
    const [teamName, setTeamName] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !teamName) return;

        setLoading(true);
        setStatusMsg('Creating user...');
        try {
            // 1. Create User
            const userRes = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const user = await userRes.json();

            // 2. Seed players if empty
            setStatusMsg('Ensuring player pool is ready...');
            const playersRes = await fetch('/api/players');
            const playersData = await playersRes.json();
            if (playersData.length === 0) {
                setStatusMsg('Seeding mock NBA players...');
                for (const p of draftBoard) {
                    await fetch('/api/players', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            full_name: p.name,
                            position: p.pos,
                            real_team: p.team
                        })
                    });
                }
            }

            // 3. Create Game
            setStatusMsg('Creating your game instance...');
            const gameRes = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_user_id: user.user_id })
            });
            const game = await gameRes.json();

            // 4. Join Game (returns updated game with teams)
            setStatusMsg('Joining game and creating your team...');
            const joinRes = await fetch(`/api/games/${game.game_id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.user_id, team_name: teamName })
            });
            const finalGame = await joinRes.json();

            // Extract Team
            const myTeam = Object.values(finalGame.teams_by_user_id).find(
                (t: any) => t.user_id === user.user_id
            ) as any;

            setUser(user);
            setGame(finalGame);
            setTeam(myTeam);

        } catch (err: any) {
            console.error(err);
            setStatusMsg(`Error: ${err.message || 'Something went wrong.'}`);
        } finally {
            if (!statusMsg.startsWith('Error')) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="card auth-card">
                <h1>Welcome to Banana Ball</h1>
                <p className="lede" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                    Get ready to draft your ultimate NBA squad.
                </p>
                <form onSubmit={handleStart}>
                    <div className="form-group">
                        <label>General Manager Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. Sam Hinkie"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Team Name</label>
                        <input
                            type="text"
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            placeholder="e.g. Midnight Ballers"
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? statusMsg : 'Start Drafting'}
                    </button>
                </form>
            </div>
        </div>
    );
}
