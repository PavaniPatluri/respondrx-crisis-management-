import { useState } from 'react';

export default function Login({ onLoginComplete, backendUrl }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        throw new Error('Access Denied: Invalid Credentials');
      }

      const data = await res.json();
      localStorage.setItem('nexus_token', data.token);
      onLoginComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0a0b10 0%, #000 100%)',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{
        background: 'rgba(17, 19, 24, 0.75)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px',
        padding: '40px', width: '380px', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase' }}>
            RespondrX
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Smart Crisis Management for Hospitality
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="Operator ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', padding: '14px', borderRadius: '8px', fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace', outline: 'none'
            }}
            required
          />
          <input
            type="password"
            placeholder="Access Code"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', padding: '14px', borderRadius: '8px', fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace', outline: 'none', letterSpacing: '0.2em'
            }}
            required
          />
          
          {error && (
            <div style={{ color: 'var(--clr-critical)', fontSize: '12px', background: 'rgba(255,68,68,0.1)', padding: '8px', borderRadius: '4px' }}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              padding: '14px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', marginTop: '8px', transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'ESTABLISH LINK'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          System Version 3.0.0
        </div>
      </div>
    </div>
  );
}
