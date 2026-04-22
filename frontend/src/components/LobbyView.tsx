import { useState, useEffect } from 'react';
import { useApp } from '../AppState';
import { draftBoard } from '../mockData';

export function LobbyView() {
    const { user, setGame, setTeam, setUser, showToast } = useApp();
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Create Game State
    const [createName, setCreateName] = useState('');

    // Game Join State
    const [joinId, setJoinId] = useState('');
    const [joinTeamName, setJoinTeamName] = useState('');

    const fetchUserGames = async () => {
        if (!user) return;
        try {
            // Refresh user to get latest game_ids
            const uRes = await fetch(`/api/users/${user.user_id}`);
            const latestUser = await uRes.json();
            setUser(latestUser);

            const allGamesRes = await fetch('/api/games');
            const allGames = await allGamesRes.json();

            const myGames = allGames.filter((g: any) => latestUser.game_ids.includes(g.game_id));
            setGames(myGames);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchUserGames();
    }, [user?.user_id]);

    const loadGame = (gameObj: any) => {
        const myTeam = Object.values(gameObj.teams_by_user_id || {}).find(
            (t: any) => t.owner_user_id === user?.user_id
        ) as any;
        setGame(gameObj);
        setTeam(myTeam || null);
    };

    const seedPlayersIfNeeded = async () => {
        const playersRes = await fetch('/api/players');
        const playersData = await playersRes.json();
        if (playersData.length === 0) {
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
    };

    const handleCreateGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName) return;

        setLoading(true);
        try {
            await seedPlayersIfNeeded();
            const gameRes = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_user_id: user?.user_id, name: createName })
            });
            const newGame = await gameRes.json();

            // Auto join
            const joinRes = await fetch(`/api/games/${newGame.game_id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.user_id, team_name: 'My Team' })
            });
            loadGame(await joinRes.json());
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinId || !joinTeamName) return;
        setLoading(true);
        try {
            const joinRes = await fetch(`/api/games/${joinId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.user_id, team_name: joinTeamName })
            });
            if (!joinRes.ok) throw new Error("Invalid Game ID or Join Failed");
            loadGame(await joinRes.json());
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid-2">
            <section className="card">
                <h2>Your Active Games</h2>
                {games.length === 0 ? (
                    <p className="muted">You aren't in any games yet.</p>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>League</th>
                                    <th>Status</th>
                                    <th>Week</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map(g => (
                                    <tr key={g.game_id}>
                                        <td>
                                            <strong>{g.name}</strong><br />
                                            <small className="muted" style={{ fontSize: '0.75rem' }}>{g.game_id}</small>
                                        </td>
                                        <td><span className="pill">{g.status}</span></td>
                                        <td>{g.current_week}</td>
                                        <td>
                                            <button className="btn-ghost" onClick={() => loadGame(g)}>Load Game</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div style={{ marginTop: '2rem' }}>
                    <h4>Create New Game</h4>
                    <form onSubmit={handleCreateGame}>
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label>Game Name</label>
                            <input
                                type="text"
                                value={createName}
                                onChange={e => setCreateName(e.target.value)}
                                placeholder="e.g. Capstone League"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            + Create New Game
                        </button>
                    </form>
                </div>
            </section>

            <section className="card">
                <h2>Join Existing Game</h2>
                <form onSubmit={handleJoinGame}>
                    <div className="form-group">
                        <label>Game ID</label>
                        <input
                            type="text"
                            value={joinId}
                            onChange={e => setJoinId(e.target.value)}
                            placeholder="UUID"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Your Team Name</label>
                        <input
                            type="text"
                            value={joinTeamName}
                            onChange={e => setJoinTeamName(e.target.value)}
                            placeholder="e.g. Splash Brothers"
                            required
                        />
                    </div>
                    <button type="submit" className="btn-secondary" disabled={loading}>
                        Join League
                    </button>
                </form>
            </section>
        </div>
    );
}
