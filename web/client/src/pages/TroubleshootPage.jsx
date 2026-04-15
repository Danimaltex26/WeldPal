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
  const [model, setModel] = useState('');
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
      setModel(res.model || '');
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
      setModel(res.model || '');
      setFollowUp('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ weld_process: '', base_material: '', filler_metal: '', position: '', symptom: '', environment: '', current_parameters: '' });
    setTried([]); setResult(null); setModel(''); setSessionId(null); setFollowUp(''); setErr('');
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
          {/* Safety callout — top priority when present */}
          {result.safety_callout && (
            <div className="warning-box">
              <strong>Safety: </strong>{result.safety_callout}
            </div>
          )}

          {/* Plain English Summary */}
          {result.plain_english_summary && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Diagnosis</h3>
              {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginBottom: '0.5rem' }}>{model}</div>}
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.plain_english_summary}</p>
            </div>
          )}

          {/* Probable Causes — each with its own fix_path + parameter_adjustments */}
          {Array.isArray(result.probable_causes) && result.probable_causes.length > 0 && (
            <div className="stack">
              <h3>Probable causes</h3>
              {result.probable_causes.map((c, i) => {
                const rank = c.rank ?? i + 1;
                const fixSteps = c.fix_path || c.fix_steps || [];
                const params = c.parameter_adjustments || {};
                const hasParams = params && Object.values(params).some(Boolean);
                return (
                  <div key={i} className="card">
                    <div className="row" style={{ marginBottom: '0.5rem', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{
                          minWidth: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#F97316',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                        }}>
                          {rank}
                        </div>
                        <strong style={{ lineHeight: 1.3 }}>{c.cause}</strong>
                      </div>
                      {c.likelihood && (
                        <span className={`badge ${c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray'}`}>
                          {c.likelihood}
                        </span>
                      )}
                    </div>

                    {c.explanation && (
                      <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                        {c.explanation}
                      </p>
                    )}

                    {c.code_disposition && (
                      <p style={{ fontSize: '0.8125rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(249,115,22,0.08)', borderLeft: '3px solid #F97316', borderRadius: 4 }}>
                        <strong>Code disposition: </strong>{c.code_disposition}
                      </p>
                    )}

                    {hasParams && (
                      <div style={{ marginBottom: fixSteps.length > 0 ? '0.75rem' : 0 }}>
                        <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                          Parameter Adjustments
                        </p>
                        <div style={{ fontSize: '0.875rem' }}>
                          {Object.entries(params).map(([k, v]) => (
                            v ? (
                              <p key={k} style={{ marginBottom: '0.25rem' }}>
                                <strong style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</strong> {v}
                              </p>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    {fixSteps.length > 0 && (
                      <div style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #2A2A2E' }}>
                        <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                          Fix Path
                        </p>
                        <div className="stack-sm">
                          {fixSteps.map((step, si) => (
                            <div key={si} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, color: '#F97316', minWidth: 18, fontSize: '0.875rem' }}>
                                {step.step ?? si + 1}.
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.9375rem' }}>{step.action || step.instruction || step}</p>
                                {step.tip && (
                                  <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                    Tip: {step.tip}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Escalate Warning */}
          {result.escalate_if && (
            <div className="warning-box">
              <strong>Escalate if: </strong>{result.escalate_if}
            </div>
          )}

          {/* Estimated Fix Time + AWS/code reference */}
          {(result.estimated_fix_time || result.aws_or_code_reference) && (
            <div className="card">
              {result.estimated_fix_time && (
                <p style={{ fontSize: '0.9375rem', marginBottom: result.aws_or_code_reference ? '0.5rem' : 0 }}>
                  <span className="text-secondary">Estimated fix time: </span>
                  <strong>{result.estimated_fix_time}</strong>
                </p>
              )}
              {result.aws_or_code_reference && (
                <p style={{ fontSize: '0.9375rem' }}>
                  <span className="text-secondary">Code reference: </span>
                  <strong>{result.aws_or_code_reference}</strong>
                </p>
              )}
            </div>
          )}

          {/* Confidence */}
          {result.confidence && (
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-secondary">Confidence</span>
                <span className={`badge ${result.confidence === 'high' ? 'badge-green' : result.confidence === 'medium' ? 'badge-amber' : 'badge-red'}`}>
                  {result.confidence}
                </span>
              </div>
              {result.confidence_reasoning && (
                <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  {result.confidence_reasoning}
                </p>
              )}
            </div>
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
