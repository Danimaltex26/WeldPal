import { useState } from 'react';
import { apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PROCESSES = ['MIG/GMAW', 'TIG/GTAW', 'Stick/SMAW', 'Flux-Core/FCAW', 'SAW', 'Other'];
const MATERIALS = ['Carbon Steel', 'Stainless Steel', 'Aluminum', 'Alloy Steel', 'Cast Iron', 'Other'];
const POSITIONS = [
  '1F Flat Fillet', '2F Horizontal Fillet', '3F Vertical Fillet', '4F Overhead Fillet',
  '1G Flat Groove', '2G Horizontal Groove', '3G Vertical Groove', '4G Overhead Groove',
  '5G Pipe Fixed', '6G Pipe 45°',
];
const SYMPTOMS = [
  'Excessive Porosity', 'Cracking', 'Undercut', 'Lack of Fusion', 'Burn-Through',
  'Distortion/Warping', 'Spatter Excessive', 'Poor Arc Start', 'Arc Instability',
  'Wire Feed Problems', 'Contamination', 'Discoloration', 'Other',
];
const ENVIRONMENTS = ['Indoor Shop', 'Outdoor Calm', 'Outdoor Wind', 'Confined Space', 'Overhead', 'Other'];
const TRIED = [
  'Cleaned base metal', 'Changed filler metal', 'Adjusted amperage', 'Adjusted voltage',
  'Adjusted travel speed', 'Adjusted wire feed speed', 'Changed shielding gas', 'Replaced contact tip', 'Nothing yet',
];

const LOADING = ['Analyzing your situation...', 'Building your fix...'];

export default function TroubleshootPage() {
  const [form, setForm] = useState({
    weld_process: '', base_material: '', filler_metal: '', position: '',
    symptom: '', environment: '', current_parameters: '',
  });
  const [tried, setTried] = useState([]);
  const [followUp, setFollowUp] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function toggleTried(t) {
    setTried((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  }

  async function diagnose() {
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await apiPost('/troubleshoot', { ...form, already_tried: tried });
      setResult(res.result);
      setSessionId(res.session_id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function askFollowUp() {
    if (!followUp.trim()) return;
    setLoading(true); setErr('');
    try {
      const res = await apiPost('/troubleshoot', { session_id: sessionId, follow_up: followUp });
      setResult(res.result);
      setFollowUp('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ weld_process: '', base_material: '', filler_metal: '', position: '', symptom: '', environment: '', current_parameters: '' });
    setTried([]); setResult(null); setSessionId(null); setFollowUp(''); setErr('');
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Troubleshoot</h1>
        <p className="text-secondary">Describe the problem — get a fix.</p>
      </div>

      {!result && (
        <div className="stack">
          <div className="form-group">
            <label>Welding process</label>
            <select className="select" value={form.weld_process} onChange={(e) => update('weld_process', e.target.value)}>
              <option value="">Select process...</option>
              {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Base material</label>
            <select className="select" value={form.base_material} onChange={(e) => update('base_material', e.target.value)}>
              <option value="">Select material...</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Filler metal / wire</label>
            <input className="input" placeholder="e.g. ER70S-6, E7018" value={form.filler_metal} onChange={(e) => update('filler_metal', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Joint position</label>
            <select className="select" value={form.position} onChange={(e) => update('position', e.target.value)}>
              <option value="">Select position...</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Primary symptom</label>
            <select className="select" value={form.symptom} onChange={(e) => update('symptom', e.target.value)}>
              <option value="">Select symptom...</option>
              {SYMPTOMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Environment</label>
            <select className="select" value={form.environment} onChange={(e) => update('environment', e.target.value)}>
              <option value="">Select environment...</option>
              {ENVIRONMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Already tried</label>
            <div className="chip-row">
              {TRIED.map((t) => (
                <button key={t} type="button" className={`chip${tried.includes(t) ? ' active' : ''}`} onClick={() => toggleTried(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Current parameters (optional)</label>
            <input className="input" placeholder="e.g. 180A, 22V, 320 IPM, 35 CFH" value={form.current_parameters} onChange={(e) => update('current_parameters', e.target.value)} />
          </div>
          {err && <div className="error-banner">{err}</div>}
          <button className="btn btn-primary btn-block" onClick={diagnose} disabled={loading}>Diagnose</button>
        </div>
      )}

      {loading && <LoadingSpinner messages={LOADING} />}

      {result && !loading && (
        <div className="stack">
          {result.plain_english_summary && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Diagnosis</h3>
              <p>{result.plain_english_summary}</p>
            </div>
          )}

          {Array.isArray(result.probable_causes) && result.probable_causes.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Probable causes</h3>
              {result.probable_causes.map((c, i) => (
                <div key={i} style={{ marginBottom: '0.875rem' }}>
                  <div className="row" style={{ marginBottom: '0.25rem' }}>
                    <strong>#{c.rank || i + 1}</strong>
                    <span className={`badge ${c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray'}`}>{c.likelihood}</span>
                  </div>
                  <p style={{ fontWeight: 600 }}>{c.cause}</p>
                  {c.explanation && <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{c.explanation}</p>}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(result.step_by_step_fix) && result.step_by_step_fix.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Step-by-step fix</h3>
              {result.step_by_step_fix.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: '#F97316', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{s.step || i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p>{s.action}</p>
                    {s.tip && <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Tip: {s.tip}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.parameter_adjustments && Object.values(result.parameter_adjustments).some(Boolean) && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Parameter adjustments</h3>
              {Object.entries(result.parameter_adjustments).map(([k, v]) => (
                v ? <p key={k} style={{ fontSize: '0.9375rem' }}><strong>{k.replace(/_/g, ' ')}:</strong> {v}</p> : null
              ))}
            </div>
          )}

          {result.escalate_if && (
            <div className="warning-box">
              <strong>Escalate if:</strong> {result.escalate_if}
            </div>
          )}

          {result.estimated_fix_time && (
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Estimated fix time: <strong>{result.estimated_fix_time}</strong>
            </p>
          )}

          <div className="form-group">
            <label>Ask a follow-up</label>
            <textarea className="textarea" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. I tried that — porosity is still there." />
            <button className="btn btn-secondary btn-block" onClick={askFollowUp} disabled={!followUp.trim() || loading} style={{ marginTop: '0.5rem' }}>Ask</button>
          </div>

          <button className="btn btn-ghost btn-block" onClick={reset}>Start new session</button>
        </div>
      )}
    </div>
  );
}
