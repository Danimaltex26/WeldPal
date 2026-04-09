import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPatch } from '../utils/api';

const PROCESSES = ['MIG/GMAW', 'TIG/GTAW', 'Stick/SMAW', 'Flux-Core/FCAW', 'Submerged Arc/SAW'];
const CERTS = ['CW', 'CAWI', 'CWI', 'CWS', 'CRAW', 'CWEng'];
const INDUSTRIES = ['Structural', 'Pipeline', 'Shipbuilding', 'Manufacturing', 'Maintenance', 'Aerospace'];
const EXPERIENCE = ['Apprentice', 'Journeyman', 'Certified', 'Inspector'];

export default function Onboarding() {
  const nav = useNavigate();
  const [processes, setProcesses] = useState([]);
  const [certs, setCerts] = useState([]);
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function toggle(arr, setArr, item) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  async function save() {
    setBusy(true);
    setErr('');
    try {
      await apiPatch('/profile', {
        welding_processes: processes,
        certifications: certs,
        primary_industry: industry,
        experience_level: experience,
      });
      nav('/');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome to WeldPal</h1>
        <p className="text-secondary">Tell us a bit so we can tailor things.</p>
      </div>
      <div className="stack">
        <div className="form-group">
          <label>Welding processes you use</label>
          <div className="chip-row">
            {PROCESSES.map((p) => (
              <button key={p} type="button" className={`chip${processes.includes(p) ? ' active' : ''}`} onClick={() => toggle(processes, setProcesses, p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Certifications</label>
          <div className="chip-row">
            {CERTS.map((c) => (
              <button key={c} type="button" className={`chip${certs.includes(c) ? ' active' : ''}`} onClick={() => toggle(certs, setCerts, c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="industry">Primary industry</label>
          <select id="industry" className="select" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">Select industry...</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp">Experience level</label>
          <select id="exp" className="select" value={experience} onChange={(e) => setExperience(e.target.value)}>
            <option value="">Select experience...</option>
            {EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        {err && <div className="error-banner">{err}</div>}
        <button className="btn btn-primary btn-block" onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Continue'}
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => nav('/')}>Skip for now</button>
      </div>
    </div>
  );
}
