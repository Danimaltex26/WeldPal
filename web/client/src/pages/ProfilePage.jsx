import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPatch } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PROCESSES = ['MIG/GMAW', 'TIG/GTAW', 'Stick/SMAW', 'Flux-Core/FCAW', 'Submerged Arc/SAW'];
const CERTS = ['CW', 'CAWI', 'CWI', 'CWS', 'CRAW', 'CWEng'];
const INDUSTRIES = ['Structural', 'Pipeline', 'Shipbuilding', 'Manufacturing', 'Maintenance', 'Aerospace'];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet('/profile');
      setProfile(res.profile);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(field, item) {
    const arr = profile[field] || [];
    const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
    setProfile({ ...profile, [field]: next });
  }

  async function save() {
    setBusy(true); setErr('');
    try {
      const res = await apiPatch('/profile', {
        display_name: profile.display_name,
        welding_processes: profile.welding_processes,
        certifications: profile.certifications,
        primary_industry: profile.primary_industry,
        experience_level: profile.experience_level,
      });
      setProfile(res.profile);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="page"><p>Could not load profile.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile</h1>
        <p className="text-secondary">{user?.email}</p>
      </div>

      <div className="stack">
        <div className="form-group">
          <label>Display name</label>
          <input className="input" value={profile.display_name || ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Welding processes</label>
          <div className="chip-row">
            {PROCESSES.map((p) => (
              <button key={p} className={`chip${(profile.welding_processes || []).includes(p) ? ' active' : ''}`} onClick={() => toggle('welding_processes', p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Certifications</label>
          <div className="chip-row">
            {CERTS.map((c) => (
              <button key={c} className={`chip${(profile.certifications || []).includes(c) ? ' active' : ''}`} onClick={() => toggle('certifications', c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Primary industry</label>
          <select className="select" value={profile.primary_industry || ''} onChange={(e) => setProfile({ ...profile, primary_industry: e.target.value })}>
            <option value="">Select industry...</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Subscription</label>
          <p><span className="badge badge-orange">{profile.subscription_tier?.toUpperCase() || 'FREE'}</span></p>
        </div>

        {err && <div className="error-banner">{err}</div>}

        <button className="btn btn-primary btn-block" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
        <Link to="/history" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>View history</Link>
        <button className="btn btn-ghost btn-block" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
