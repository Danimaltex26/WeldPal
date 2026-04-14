import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPatch } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PROCESS_OPTIONS = ['MIG/GMAW', 'TIG/GTAW', 'Stick/SMAW', 'Flux-Core/FCAW', 'Submerged Arc/SAW'];
const CERT_OPTIONS = ['CW', 'CAWI', 'CWI', 'CWS', 'CRAW', 'CWEng'];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Display name edit
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [newProcess, setNewProcess] = useState('');
  const [newCert, setNewCert] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet('/profile');
      setProfile(data.profile);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function patchProfile(update) {
    try {
      await apiPatch('/profile', update);
      setProfile((p) => ({ ...p, ...update }));
    } catch (err) {
      setError(err.message || 'Failed to update');
    }
  }

  function startEditName() {
    setNameDraft(profile?.display_name || '');
    setEditingName(true);
  }

  async function saveDisplayName() {
    const next = nameDraft.trim() || null;
    if (next === (profile?.display_name || null)) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await apiPatch('/profile', { display_name: next });
      setProfile((p) => ({ ...p, display_name: next }));
      setEditingName(false);
    } catch (err) {
      setError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function addProcess() {
    if (!newProcess) return;
    if ((profile.welding_processes || []).includes(newProcess)) return;
    const updated = [...(profile.welding_processes || []), newProcess];
    await patchProfile({ welding_processes: updated });
    setNewProcess('');
  }

  async function removeProcess(p) {
    const updated = (profile.welding_processes || []).filter((x) => x !== p);
    await patchProfile({ welding_processes: updated });
  }

  async function addCertification() {
    if (!newCert) return;
    if ((profile.certifications || []).includes(newCert)) return;
    const updated = [...(profile.certifications || []), newCert];
    await patchProfile({ certifications: updated });
    setNewCert('');
  }

  async function removeCertification(c) {
    const updated = (profile.certifications || []).filter((x) => x !== c);
    await patchProfile({ certifications: updated });
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      setError(err.message || 'Failed to sign out');
    }
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <p>Could not load profile.</p>
      </div>
    );
  }

  const tier = profile?.subscription_tier || 'Free';
  const isFree = tier.toLowerCase() === 'free';

  return (
    <div className="page">
      <div className="stack">
        <div className="page-header">
          <h2>Profile</h2>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* User Info */}
        <div className="card">
          <div className="row-between">
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <div className="row" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Your name"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveDisplayName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={saveDisplayName}
                    disabled={savingName}
                    style={{ flexShrink: 0, minHeight: 40, fontSize: '0.875rem' }}
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditingName(false)}
                    disabled={savingName}
                    style={{ flexShrink: 0, minHeight: 40, fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: '1.0625rem' }}>
                    {profile?.display_name || 'Add your name'}
                  </p>
                  <button
                    type="button"
                    onClick={startEditName}
                    title="Edit display name"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#A0A0A8',
                      padding: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{user?.email}</p>
            </div>
            <span className={`badge ${isFree ? 'badge-gray' : 'badge-green'}`}>
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Usage (Free tier only) */}
        {isFree && profile?.usage && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Usage This Month</h3>
            <div className="stack-sm">
              <div className="row-between">
                <span className="text-secondary">Weld Analyses</span>
                <span style={{ fontWeight: 600 }}>
                  {profile.usage.weld_count ?? 0} / 2
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#2A2A2E', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(((profile.usage.weld_count ?? 0) / 2) * 100, 100)}%`,
                  background: '#F97316',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div className="row-between" style={{ marginTop: '0.5rem' }}>
                <span className="text-secondary">Troubleshoot Sessions</span>
                <span style={{ fontWeight: 600 }}>
                  {profile.usage.troubleshoot_count ?? 0} / 2
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#2A2A2E', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(((profile.usage.troubleshoot_count ?? 0) / 2) * 100, 100)}%`,
                  background: '#F97316',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div className="row-between" style={{ marginTop: '0.5rem' }}>
                <span className="text-secondary">AI Reference Lookups</span>
                <span style={{ fontWeight: 600 }}>
                  {profile.usage.reference_count ?? 0} / 5
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#2A2A2E', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(((profile.usage.reference_count ?? 0) / 5) * 100, 100)}%`,
                  background: '#F97316',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade to Pro */}
        {isFree && (
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Upgrade to Pro</h3>
            <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Unlimited photo analyses, troubleshoot sessions, AI reference lookups, full training content, and priority processing.
            </p>
            <a
              href="https://tradepals.net/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-block"
            >
              View Pro Plans
            </a>
          </div>
        )}

        {/* Welding Processes */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>My Welding Processes</h3>
          {profile?.welding_processes?.length > 0 ? (
            <div className="stack-sm" style={{ marginBottom: '0.75rem' }}>
              {profile.welding_processes.map((p) => (
                <div key={p} className="row-between" style={{ minHeight: 40 }}>
                  <span>{p}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ color: '#EF4444', minHeight: 36, padding: '0.25rem 0.5rem' }}
                    onClick={() => removeProcess(p)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              No welding processes added yet.
            </p>
          )}
          <div className="row" style={{ gap: '0.5rem' }}>
            <select
              className="select"
              value={newProcess}
              onChange={(e) => setNewProcess(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select process...</option>
              {PROCESS_OPTIONS
                .filter((p) => !(profile?.welding_processes || []).includes(p))
                .map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
            </select>
            <button className="btn btn-secondary" onClick={addProcess} style={{ flexShrink: 0 }}>
              Add
            </button>
          </div>
        </div>

        {/* Certifications */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>My Certifications</h3>
          {profile?.certifications?.length > 0 ? (
            <div className="stack-sm" style={{ marginBottom: '0.75rem' }}>
              {profile.certifications.map((cert) => (
                <div key={cert} className="row-between" style={{ minHeight: 40 }}>
                  <span className="badge badge-blue">{cert}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ color: '#EF4444', minHeight: 36, padding: '0.25rem 0.5rem' }}
                    onClick={() => removeCertification(cert)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              No certifications added yet.
            </p>
          )}
          <div className="row" style={{ gap: '0.5rem' }}>
            <select
              className="select"
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select certification...</option>
              {CERT_OPTIONS
                .filter((c) => !(profile?.certifications || []).includes(c))
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
            <button className="btn btn-secondary" onClick={addCertification} style={{ flexShrink: 0 }}>
              Add
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button className="btn btn-danger btn-block" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
