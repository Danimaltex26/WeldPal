import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPatch, apiDelete } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TeamSettings() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Team name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Remove confirmation
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await apiGet('/teams/settings');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveTeamName() {
    const next = nameDraft.trim();
    if (!next || next === data.team.team_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await apiPatch('/teams/settings', { teamName: next });
      setData((d) => ({ ...d, team: res.team }));
      setEditingName(false);
    } catch (err) {
      setError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function handleRemove(userId) {
    setRemoving(true);
    try {
      await apiDelete(`/teams/member/${userId}`);
      setData((d) => ({
        ...d,
        members: d.members.map((m) =>
          m.user_id === userId ? { ...m, status: 'removed' } : m
        ),
        team: { ...d.team, seats_used: Math.max(0, d.team.seats_used - 1) },
      }));
      setConfirmRemove(null);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
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
        <LoadingSpinner message="Loading settings..." />
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

  const { team, members, invites } = data;
  const activeMembers = members.filter((m) => m.status === 'active');

  return (
    <div className="page stack">
      {/* Back button */}
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/dashboard')}
        style={{ alignSelf: 'flex-start', padding: '0.25rem 0', gap: '0.25rem', display: 'flex', alignItems: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Dashboard
      </button>

      <div className="page-header">
        <h2>Team Settings</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Team name */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Team Name</h3>
        {editingName ? (
          <div className="row" style={{ gap: '0.5rem' }}>
            <input
              type="text"
              className="input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTeamName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={saveTeamName} disabled={savingName} style={{ flexShrink: 0 }}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditingName(false)} disabled={savingName} style={{ flexShrink: 0 }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="row-between" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{team.team_name}</span>
            <button
              className="btn btn-ghost"
              onClick={() => { setNameDraft(team.team_name); setEditingName(true); }}
              style={{ padding: 4 }}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Invite code */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Invite Code</h3>
        <div className="row" style={{ gap: '0.5rem' }}>
          <input
            className="input"
            readOnly
            value={team.invite_code}
            style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }}
          />
          <button
            className="btn btn-secondary"
            onClick={() => copyToClipboard(team.invite_code)}
            style={{ flexShrink: 0 }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Seats */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Seats</h3>
        <div className="row-between">
          <span className="text-secondary">Used</span>
          <span style={{ fontWeight: 600 }}>{team.seats_used} of {team.seats_purchased}</span>
        </div>
        <div style={{
          height: 6, borderRadius: 3, background: '#2A2A2E', overflow: 'hidden', marginTop: '0.5rem',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min((team.seats_used / team.seats_purchased) * 100, 100)}%`,
            background: team.seats_used >= team.seats_purchased ? '#F59E0B' : '#F97316',
            borderRadius: 3,
          }} />
        </div>
        {/* TODO: connect to billing portal when team billing is ready */}
      </div>

      {/* Active members */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Crew Members</h3>
        <div className="stack-sm">
          {activeMembers.map((m) => {
            const profile = m.profiles;
            const isManager = m.user_id === team.manager_id;

            return (
              <div key={m.user_id} className="row-between" style={{ minHeight: 44, alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: 600 }}>
                    {profile?.display_name || profile?.email}
                    {isManager && <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>Manager</span>}
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                    {profile?.email} · Joined {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>

                {!isManager && (
                  confirmRemove === m.user_id ? (
                    <div className="row" style={{ gap: '0.25rem' }}>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: 32 }}
                        onClick={() => handleRemove(m.user_id)}
                        disabled={removing}
                      >
                        {removing ? '...' : 'Confirm'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: 32 }}
                        onClick={() => setConfirmRemove(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      style={{ color: '#EF4444', fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: 32 }}
                      onClick={() => setConfirmRemove(m.user_id)}
                    >
                      Remove
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Pending Invites</h3>
          <div className="stack-sm">
            {invites.map((inv) => (
              <div key={inv.id} className="row-between" style={{ minHeight: 36 }}>
                <div>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    {inv.email || <span className="text-muted">Code: {inv.invite_code}</span>}
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge badge-amber">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
