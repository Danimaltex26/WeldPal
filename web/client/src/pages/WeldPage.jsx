// Weld Photo Analyzer — hero feature.
// IMPORTANT: scope disclaimer (visual surface defects only) is shown on every result.
import { useRef, useState } from 'react';
import { apiUpload } from '../utils/api';
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

export default function WeldPage() {
  const [process, setProcess] = useState('');
  const [material, setMaterial] = useState('');
  const [code, setCode] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
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
      files.forEach((f) => fd.append('images', f));
      if (process) fd.append('weld_process', process);
      if (material) fd.append('base_material', material);
      if (code) fd.append('code_standard', code);
      const res = await apiUpload('/weld/analyze', fd);
      setResult(res.result);
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
    setErr('');
    setQueued(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleViewQueueResult(item) {
    if (item.result) {
      setResult(item.result);
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

      {result && (
        <div className="stack">
          <div style={{ textAlign: 'center' }}>
            <span className={`badge badge-lg ${assessmentClass(result.overall_assessment)}`}>
              {assessmentLabel(result.overall_assessment)}
            </span>
          </div>

          {previews.length > 0 && previews.map((src, i) => (
            <img key={i} src={src} alt={`Weld ${i + 1}`} className="image-preview" />
          ))}

          {result.plain_english_summary && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Summary</h3>
              <p>{result.plain_english_summary}</p>
            </div>
          )}

          {result.assessment_reasoning && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Reasoning</h3>
              <p className="text-secondary">{result.assessment_reasoning}</p>
            </div>
          )}

          {Array.isArray(result.defects_identified) && result.defects_identified.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Defects identified</h3>
              <div className="stack">
                {result.defects_identified.map((d, i) => (
                  <div key={i} style={{ borderTop: i ? '1px solid #2A2A2E' : 'none', paddingTop: i ? '0.875rem' : 0 }}>
                    <div className="row" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-orange">{(d.defect_type || '').replace(/_/g, ' ')}</span>
                      {d.severity && <span className="badge badge-gray">{d.severity}</span>}
                      {d.code_accept_reject && <span className={`badge ${d.code_accept_reject === 'accept' ? 'badge-green' : d.code_accept_reject === 'reject' ? 'badge-red' : 'badge-amber'}`}>{d.code_accept_reject}</span>}
                    </div>
                    {d.location && <p style={{ fontSize: '0.875rem' }}><strong>Location:</strong> {d.location}</p>}
                    {d.probable_cause && <p style={{ fontSize: '0.875rem' }} className="text-secondary"><strong>Cause:</strong> {d.probable_cause}</p>}
                    {d.corrective_action && <p style={{ fontSize: '0.875rem' }} className="text-secondary"><strong>Fix:</strong> {d.corrective_action}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommended_parameter_adjustments && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Parameter adjustments</h3>
              <p className="text-secondary">{result.recommended_parameter_adjustments}</p>
            </div>
          )}

          {result.code_reference && (
            <div className="info-box">
              <strong>Code reference:</strong> {result.code_reference}
            </div>
          )}

          {result.image_quality_note && (
            <div className="warning-box">
              <strong>Image quality:</strong> {result.image_quality_note}
            </div>
          )}

          {result.confidence && (
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Confidence: <strong>{result.confidence}</strong>
              {result.confidence_reason && ` — ${result.confidence_reason}`}
            </p>
          )}

          <div className="scope-disclaimer">
            {result.scope_disclaimer || 'Visual surface analysis only. Subsurface defects require NDT.'}
          </div>

          <button className="btn btn-primary btn-block" onClick={reset}>Start new analysis</button>
        </div>
      )}
    </div>
  );
}
