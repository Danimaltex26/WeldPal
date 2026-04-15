// Weld Photo Analyzer — hero feature.
// IMPORTANT: scope disclaimer (visual surface defects only) is shown on every result.
import { useRef, useState } from 'react';
import { apiUpload } from '../utils/api';
import { compressImage } from '../utils/compressImage';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineQueue from '../components/OfflineQueue';
import useOfflineQueue from '../hooks/useOfflineQueue';

const PROCESSES = ['MIG/GMAW', 'TIG/GTAW', 'Stick/SMAW', 'Flux-Core/FCAW', 'Submerged Arc/SAW', 'Other'];
const MATERIALS = ['Carbon Steel', 'Stainless Steel', 'Aluminum', 'Alloy Steel', 'Cast Iron', 'Other'];
const CODES = ['AWS D1.1', 'AWS D1.2', 'API 1104', 'ASME IX', 'AWS D1.5', 'AWS D1.6', 'AWS D1.8', 'Other/Unknown'];

const LOADING_MESSAGES = [
  'Examining weld surface...',
  'Identifying defect patterns...',
  'Checking specifications...',
];

function assessmentClass(a) {
  switch (a) {
    case 'accept': return 'assessment-accept';
    case 'repair': return 'assessment-repair';
    case 'reject': return 'assessment-reject';
    case 'further_inspection_required': return 'assessment-ndt';
    default: return 'badge-gray';
  }
}
function assessmentLabel(a) {
  switch (a) {
    case 'accept': return 'ACCEPT';
    case 'repair': return 'REPAIR';
    case 'reject': return 'REJECT';
    case 'further_inspection_required': return 'NEEDS NDT';
    default: return a || 'UNKNOWN';
  }
}

function actionBadgeClass(action) {
  if (!action) return 'badge badge-gray';
  const lower = String(action).toLowerCase();
  if (lower.includes('accept') || lower.includes('minor') || lower.includes('pass'))
    return 'badge badge-green';
  if (lower.includes('borderline') || lower.includes('moderate') || lower.includes('repair') || lower.includes('requires_measurement') || lower.includes('further'))
    return 'badge badge-amber';
  if (lower.includes('reject') || lower.includes('severe') || lower.includes('fail'))
    return 'badge badge-red';
  return 'badge badge-gray';
}

function confidenceBadgeClass(confidence) {
  if (!confidence) return 'badge badge-gray';
  const lower = String(confidence).toLowerCase();
  if (lower.includes('high')) return 'badge badge-green';
  if (lower.includes('medium')) return 'badge badge-amber';
  return 'badge badge-red';
}

export default function WeldPage() {
  const [process, setProcess] = useState('');
  const [material, setMaterial] = useState('');
  const [code, setCode] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const [model, setModel] = useState('');
  const [queued, setQueued] = useState(false);
  const fileInputRef = useRef(null);
  const offlineQueue = useOfflineQueue();

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []).slice(0, 4);
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
    setErr('');
    setResult(null);
    setQueued(false);
  }

  async function analyze() {
    if (!files.length) {
      setErr('Please upload a photo of the weld first.');
      return;
    }

    setErr('');
    setResult(null);
    setQueued(false);

    // If offline, queue it
    if (!navigator.onLine) {
      await offlineQueue.enqueue(files, {
        weld_process: process,
        base_material: material,
        code_standard: code,
      });
      setQueued(true);
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Online — upload directly
    setLoading(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        fd.append('images', compressed);
      }
      if (process) fd.append('weld_process', process);
      if (material) fd.append('base_material', material);
      if (code) fd.append('code_standard', code);
      const res = await apiUpload('/weld/analyze', fd);
      setResult(res.result);
      setModel(res.model || '');
    } catch (e) {
      // If upload fails (network dropped mid-request), queue it
      if (!navigator.onLine || e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('Network')) {
        await offlineQueue.enqueue(files, {
          weld_process: process,
          base_material: material,
          code_standard: code,
        });
        setQueued(true);
        setFiles([]);
        setPreviews([]);
      } else {
        setErr(e.message || 'Analysis failed');
      }
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function reset() {
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setModel('');
    setErr('');
    setQueued(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleViewQueueResult(item) {
    if (item.result) {
      setResult(item.result);
      setModel(item.model || '');
      offlineQueue.dismiss(item.id);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Weld Analyzer</h1>
        <p className="text-secondary">Photograph a weld for AI surface assessment.</p>
      </div>

      {/* Offline indicator */}
      {!navigator.onLine && !result && (
        <div className="warning-box" style={{ fontSize: '0.875rem' }}>
          You are offline. Photos will be queued and processed automatically when you reconnect.
        </div>
      )}

      {/* Queued confirmation */}
      {queued && !result && (
        <div className="info-box" style={{ fontSize: '0.875rem' }}>
          Photo queued! It will be processed automatically when you're back online.
        </div>
      )}

      {!result && (
        <div className="stack">
          <div className="form-group">
            <label htmlFor="process">Welding process</label>
            <select id="process" className="select" value={process} onChange={(e) => setProcess(e.target.value)}>
              <option value="">Select process...</option>
              {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="material">Base material</label>
            <select id="material" className="select" value={material} onChange={(e) => setMaterial(e.target.value)}>
              <option value="">Select material...</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="code">Applicable code (optional)</label>
            <select id="code" className="select" value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="">Select code...</option>
              {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="upload-zone" htmlFor="weld-files">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="upload-text">{files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} ready` : 'Tap to upload weld photo'}</span>
            <span className="upload-hint">Up to 4 images, 10 MB each</span>
            <input
              ref={fileInputRef}
              id="weld-files"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={onPickFiles}
              style={{ display: 'none' }}
            />
          </label>

          {previews.length > 0 && (
            <div className="stack-sm">
              {previews.map((src, i) => (
                <img key={i} src={src} alt={`Weld preview ${i + 1}`} className="image-preview" />
              ))}
            </div>
          )}

          <div className="scope-disclaimer">
            WeldPal analyzes <strong>visual surface defects only</strong>. Subsurface defects require NDT (UT, RT, MT, PT) by a qualified inspector.
          </div>

          {err && <div className="error-banner">{err}</div>}

          <button className="btn btn-primary btn-block" onClick={analyze} disabled={loading || !files.length}>
            {navigator.onLine ? 'Analyze this weld' : 'Queue for analysis'}
          </button>

          {/* Offline Queue */}
          <OfflineQueue
            queue={offlineQueue.queue}
            processing={offlineQueue.processing}
            onRetry={offlineQueue.retry}
            onDismiss={offlineQueue.dismiss}
            onViewResult={handleViewQueueResult}
            onClearCompleted={offlineQueue.clearCompleted}
          />
        </div>
      )}

      {loading && <LoadingSpinner messages={LOADING_MESSAGES} />}

      {result && (() => {
        const ctx = result.weld_context;
        const params = result.parameter_adjustments;
        const imageUsable = result.is_weld_image !== false && result.image_quality?.usable !== false;
        const defects = Array.isArray(result.defects) ? result.defects : [];
        const realDefects = defects.filter((d) => d && d.defect_type && d.defect_type !== 'none_detected');
        const hasParamAdjustments = params && Object.values(params).some((v) => v);
        const hasContext = ctx && (
          (ctx.likely_process && ctx.likely_process !== 'Unknown') ||
          (ctx.likely_position && ctx.likely_position !== 'Unknown') ||
          (ctx.base_material_guess && ctx.base_material_guess !== 'Unknown') ||
          (ctx.joint_type_guess && ctx.joint_type_guess !== 'Unknown')
        );

        return (
          <div className="stack">
            {previews.length > 0 && previews.map((src, i) => (
              <img key={i} src={src} alt={`Weld ${i + 1}`} className="image-preview" />
            ))}

            {/* Unusable image warning */}
            {!imageUsable && (
              <div className="warning-box">
                <strong>Image could not be analyzed.</strong>
                {result.image_quality?.quality_note && (
                  <p style={{ marginTop: '0.25rem' }}>{result.image_quality.quality_note}</p>
                )}
              </div>
            )}

            {/* Overall Assessment Badge */}
            {imageUsable && result.overall_assessment && (
              <div className="card" style={{ textAlign: 'center' }}>
                <span className={`badge badge-lg ${assessmentClass(result.overall_assessment)}`} style={{ fontSize: '1.25rem', padding: '0.5rem 1.5rem' }}>
                  {assessmentLabel(result.overall_assessment)}
                </span>
                {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.5rem' }}>{model}</div>}
              </div>
            )}

            {/* Assessment Reasoning (main summary) */}
            {result.assessment_reasoning && (
              <div className="card">
                <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.assessment_reasoning}</p>
              </div>
            )}

            {/* Detected Context */}
            {hasContext && (
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>Detected</h3>
                <div className="stack-sm">
                  {ctx.likely_process && ctx.likely_process !== 'Unknown' && (
                    <div className="row-between">
                      <span className="text-secondary">Process</span>
                      <span className="badge badge-blue">{ctx.likely_process}</span>
                    </div>
                  )}
                  {ctx.base_material_guess && ctx.base_material_guess !== 'Unknown' && (
                    <div className="row-between">
                      <span className="text-secondary">Base Material</span>
                      <span style={{ fontWeight: 600 }}>{ctx.base_material_guess}</span>
                    </div>
                  )}
                  {ctx.likely_position && ctx.likely_position !== 'Unknown' && (
                    <div className="row-between">
                      <span className="text-secondary">Position</span>
                      <span style={{ fontWeight: 600 }}>{ctx.likely_position}</span>
                    </div>
                  )}
                  {ctx.joint_type_guess && ctx.joint_type_guess !== 'Unknown' && (
                    <div className="row-between">
                      <span className="text-secondary">Joint Type</span>
                      <span style={{ fontWeight: 600 }}>{ctx.joint_type_guess}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Defects */}
            {imageUsable && realDefects.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>Defects Found</h3>
                <div className="stack-sm">
                  {realDefects.map((d, i) => (
                    <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div className="row-between" style={{ marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <strong>{d.defect_type.replace(/_/g, ' ')}</strong>
                        <span style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {d.severity && <span className={actionBadgeClass(d.severity)}>{d.severity}</span>}
                          {d.code_disposition && <span className={actionBadgeClass(d.code_disposition)}>{d.code_disposition.replace(/_/g, ' ')}</span>}
                        </span>
                      </div>
                      {d.location && <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Location: {d.location}</p>}
                      {d.probable_cause && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Cause:</span> {d.probable_cause}</p>}
                      {d.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {d.corrective_action}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No defects detected */}
            {imageUsable && realDefects.length === 0 && defects.length > 0 && (
              <div className="card">
                <div className="row-between">
                  <span style={{ fontWeight: 600 }}>No surface defects detected</span>
                  <span className="badge badge-green">clean</span>
                </div>
              </div>
            )}

            {/* Parameter Adjustments */}
            {hasParamAdjustments && (
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>Parameter Adjustments</h3>
                <div className="stack-sm">
                  {params.amperage && (
                    <div className="row-between">
                      <span className="text-secondary">Amperage</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.amperage}</span>
                    </div>
                  )}
                  {params.voltage && (
                    <div className="row-between">
                      <span className="text-secondary">Voltage</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.voltage}</span>
                    </div>
                  )}
                  {params.travel_speed && (
                    <div className="row-between">
                      <span className="text-secondary">Travel Speed</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.travel_speed}</span>
                    </div>
                  )}
                  {params.wire_feed_speed && (
                    <div className="row-between">
                      <span className="text-secondary">Wire Feed Speed</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.wire_feed_speed}</span>
                    </div>
                  )}
                  {params.preheat && (
                    <div className="row-between">
                      <span className="text-secondary">Preheat</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.preheat}</span>
                    </div>
                  )}
                  {params.technique && (
                    <div className="row-between">
                      <span className="text-secondary">Technique</span>
                      <span style={{ textAlign: 'right', maxWidth: '70%' }}>{params.technique}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Code References */}
            {Array.isArray(result.code_references) && result.code_references.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '0.75rem' }}>Code References</h3>
                <div className="stack-sm">
                  {result.code_references.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.875rem' }}>
                      <strong>{s.standard}</strong>
                      {s.clause && <span className="text-secondary"> · {s.clause}</span>}
                      {s.requirement && <p className="text-secondary" style={{ marginTop: '0.125rem' }}>{s.requirement}</p>}
                      {s.applies_to && <p className="text-muted" style={{ fontSize: '0.75rem' }}>Applies to: {s.applies_to}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Next Steps */}
            {result.recommended_next_steps && (
              <div className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>Next Steps</h3>
                <p>{result.recommended_next_steps}</p>
              </div>
            )}

            {/* Confidence */}
            {result.confidence && (
              <div className="card">
                <div className="row-between">
                  <span className="text-secondary">Confidence</span>
                  <span className={confidenceBadgeClass(result.confidence)}>{result.confidence}</span>
                </div>
                {result.confidence_reasoning && (
                  <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>{result.confidence_reasoning}</p>
                )}
              </div>
            )}

            {/* Scope Disclaimer */}
            <div className="scope-disclaimer">
              {result.scope_disclaimer || 'Visual surface analysis only. Subsurface defects require NDT.'}
            </div>

            <button className="btn btn-primary btn-block" onClick={reset}>Start new analysis</button>
          </div>
        );
      })()}
    </div>
  );
}
