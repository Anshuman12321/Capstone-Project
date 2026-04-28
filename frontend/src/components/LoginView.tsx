import { useState } from 'react';
import { useApp } from '../AppState';

export function LoginView() {
    const { setUser, showToast } = useApp();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            });
            if (!res.ok) throw new Error(await res.text());
            const user = await res.json();
            setUser(user);
        } catch (err: any) {
            console.error(err);
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="card auth-card">
                <h1>Welcome to Banana Ball</h1>
                <p className="lede" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                    Log in with your GM name to manage your franchise.
                </p>
                <form onSubmit={handleLogin}>
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
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
