import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

function assessmentBadge(a) {
  switch (a) {
    case 'accept': return <span className="badge badge-green">Accept</span>;
    case 'repair': return <span className="badge badge-amber">Repair</span>;
    case 'reject': return <span className="badge badge-red">Reject</span>;
    case 'further_inspection_required': return <span className="badge badge-blue">Needs NDT</span>;
    default: return <span className="badge badge-gray">{a || '—'}</span>;
  }
}

export default function HistoryPage() {
  const [data, setData] = useState({ weld_analyses: [], troubleshoot_sessions: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('welds');
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await apiGet('/history');
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>History</h1>
      </div>
      <div className="chip-row" style={{ marginBottom: '1rem' }}>
        <button className={`chip${tab === 'welds' ? ' active' : ''}`} onClick={() => setTab('welds')}>
          Welds ({data.weld_analyses.length})
        </button>
        <button className={`chip${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>
          Troubleshoot ({data.troubleshoot_sessions.length})
        </button>
      </div>

      {err && <div className="error-banner">{err}</div>}

      {tab === 'welds' && (
        <div className="stack">
          {data.weld_analyses.length === 0 && <p className="text-secondary text-center">No weld analyses yet.</p>}
          {data.weld_analyses.map((w) => (
            <div key={w.id} className="card">
              <div className="row-between">
                <div>
                  <p style={{ fontWeight: 600 }}>{w.weld_process || 'Weld'} · {w.base_material || ''}</p>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(w.created_at).toLocaleString()}</p>
                  {w.job_reference && <p className="text-secondary" style={{ fontSize: '0.75rem' }}>Job: {w.job_reference}</p>}
                </div>
                {assessmentBadge(w.overall_assessment)}
              </div>
              {Array.isArray(w.image_urls) && w.image_urls[0] && (
                <img src={w.image_urls[0]} alt="" className="image-preview" style={{ marginTop: '0.75rem', maxHeight: 160 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="stack">
          {data.troubleshoot_sessions.length === 0 && <p className="text-secondary text-center">No troubleshoot sessions yet.</p>}
          {data.troubleshoot_sessions.map((s) => (
            <div key={s.id} className="card">
              <div className="row-between">
                <div>
                  <p style={{ fontWeight: 600 }}>{s.symptom || 'Session'}</p>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>{s.weld_process} · {s.position}</p>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(s.created_at).toLocaleString()}</p>
                </div>
                {s.resolved && <span className="badge badge-green">Resolved</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
