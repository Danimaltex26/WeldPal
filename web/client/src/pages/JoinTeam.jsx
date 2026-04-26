import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const code = searchParams.get('code');

  const [teamName, setTeamName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if user is already on a team
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch team preview (no auth needed)
  useEffect(() => {
    if (!code) {
      setPreviewError('No invite code provided');
      setPreviewLoading(false);
      return;
    }

    // Use fetch directly since apiGet requires auth
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(`${apiUrl}/api/teams/preview?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Invalid invite');
        }
        return res.json();
      })
      .then((data) => setTeamName(data.teamName))
      .catch((err) => setPreviewError(err.message))
      .finally(() => setPreviewLoading(false));
  }, [code]);

  // Fetch profile if authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfileLoading(false);
      return;
    }
    apiGet('/profile')
      .then(setProfile)
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [user, authLoading]);

  async function handleJoin() {
    setJoining(true);
    setJoinError('');
    try {
      await apiPost('/teams/join', { code });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setJoinError(err.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  }

  if (previewLoading || authLoading || profileLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Invalid or expired code
  if (previewError) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Invite Not Found</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {previewError === 'This invite has expired'
              ? 'This invite link has expired. Ask your manager for a new one.'
              : 'This invite link is invalid. Check the link and try again.'}
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
            Go to WeldPal
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#F97316', marginBottom: '0.75rem' }}>Welcome to {teamName}!</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
            You now have full Pro access. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Join {teamName}</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            You've been invited to join <strong style={{ color: '#F5F5F5' }}>{teamName}</strong> on WeldPal.
            Sign in or create an account to join.
          </p>
          <div className="stack-sm">
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`)}
            >
              Sign In
            </button>
            <button
              className="btn btn-secondary btn-block"
              onClick={() => navigate(`/signup?redirect=${encodeURIComponent(`/join?code=${code}`)}`)}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already on a team
  if (profile?.team_id) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Already on a Team</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            You're already part of {profile.team_name ? <strong style={{ color: '#F5F5F5' }}>{profile.team_name}</strong> : 'a team'}.
            Contact your manager to switch teams.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>
            Go to WeldPal
          </button>
        </div>
      </div>
    );
  }

  // Ready to join
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Join {teamName}</h2>
        <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Joining this team gives you <strong style={{ color: '#F97316' }}>Pro access</strong>, paid for by your team manager.
        </p>

        {joinError && <div className="error-banner" style={{ marginBottom: '1rem' }}>{joinError}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleJoin}
          disabled={joining}
          style={{ height: 48, fontSize: '1rem' }}
        >
          {joining ? 'Joining...' : 'Join Team'}
        </button>
      </div>
    </div>
  );
}
