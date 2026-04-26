import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite panel
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await apiGet('/teams/dashboard');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await apiPost('/teams/invite', {
        email: inviteEmail.trim() || undefined,
      });
      setInviteResult(res);
      setInviteEmail('');
    } catch (err) {
      setError(err.message || 'Failed to create invite');
    } finally {
      setInviting(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner message="Loading team dashboard..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page stack">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  const { team, members, teamStats } = data;
  const inactive = members.filter((m) => m.activity_this_week.total === 0);

  return (
    <div className="page stack">
      {/* Header */}
      <div className="row-between" style={{ alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{team.team_name}</h2>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {teamStats.total_members} member{teamStats.total_members !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard/settings')}
          title="Team settings"
          style={{ padding: 8 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{teamStats.total_members}</p>
          <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>Total Crew</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#F97316' }}>{teamStats.active_this_week}</p>
          <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>Active This Week</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#10B981' }}>{teamStats.exam_ready}</p>
          <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>Exam Ready</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{teamStats.avg_readiness}%</p>
          <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>Avg Readiness</p>
        </div>
      </div>

      {/* At-risk banner */}
      {inactive.length > 0 && (
        <div className="warning-box">
          {inactive.length} crew member{inactive.length !== 1 ? 's' : ''} ha{inactive.length !== 1 ? "ven't" : "sn't"} been active in 7+ days
        </div>
      )}

      {/* Invite button */}
      <button
        className="btn btn-primary btn-block"
        onClick={() => setShowInvite(!showInvite)}
      >
        {showInvite ? 'Close' : 'Add Crew Member'}
      </button>

      {/* Invite panel */}
      {showInvite && (
        <div className="card">
          <h4 style={{ marginBottom: '0.75rem' }}>Invite a crew member</h4>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            {team.seats_used} of {team.seats_purchased} seats used
          </p>

          {team.seats_used >= team.seats_purchased ? (
            <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
              No seats available. Contact support to add more seats.
            </p>
          ) : (
            <>
              <div className="row" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Email (optional)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleInvite}
                  disabled={inviting}
                  style={{ flexShrink: 0 }}
                >
                  {inviting ? 'Sending...' : 'Invite'}
                </button>
              </div>

              {inviteResult && (
                <div className="info-box" style={{ fontSize: '0.8125rem' }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>Invite link:</strong>
                  </p>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <input
                      className="input"
                      readOnly
                      value={inviteResult.inviteLink}
                      style={{ flex: 1, fontSize: '0.75rem' }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(inviteResult.inviteLink)}
                      style={{ flexShrink: 0 }}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Expires {new Date(inviteResult.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Crew list */}
      <div>
        <h3 style={{ marginBottom: '0.75rem' }}>Crew</h3>
        <div className="stack-sm">
          {members.map((m) => (
            <button
              key={m.user_id}
              className="card"
              onClick={() => navigate(`/dashboard/member/${m.user_id}`)}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                border: m.activity_this_week.total === 0 ? '1px solid rgba(245,158,11,0.3)' : undefined,
              }}
            >
              <div className="row-between" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: '#2A2A2E', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700,
                      color: '#A0A0A8', flexShrink: 0,
                    }}>
                      {(m.display_name || m.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>
                        {m.display_name || m.email}
                      </p>
                      {m.display_name && (
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                          {m.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {m.best_readiness && (
                      <span className={m.best_readiness.percent >= 75 ? 'badge badge-green' : 'badge badge-gray'}>
                        {m.best_readiness.cert_level} {Math.round(m.best_readiness.percent)}%
                      </span>
                    )}
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {m.activity_this_week.total > 0
                        ? `${m.activity_this_week.weld} analyses \u00b7 ${m.activity_this_week.troubleshoot} troubleshoot \u00b7 ${m.activity_this_week.training} training`
                        : 'No activity this week'}
                    </span>
                  </div>
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
