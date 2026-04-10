import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '1.5rem',
        maxWidth: 420,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <img
        src="/logo.png"
        alt="WeldPal"
        style={{ width: 260, alignSelf: 'center', marginBottom: '0.5rem' }}
      />
      <p
        className="text-secondary text-center"
        style={{ marginTop: '0.25rem', marginBottom: '2rem', fontSize: '0.875rem' }}
      >
        AI field companion for welders &amp; CWIs
      </p>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="stack">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p
        className="text-center text-secondary"
        style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}
      >
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
}
