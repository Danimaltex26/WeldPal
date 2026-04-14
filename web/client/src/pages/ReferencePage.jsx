import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const TABS = [
  { key: '', label: 'All' },
  { key: 'filler_metal', label: 'Filler' },
  { key: 'preheat', label: 'Preheat' },
  { key: 'code_requirement', label: 'Codes' },
  { key: 'weld_symbol', label: 'Symbols' },
  { key: 'defect_guide', label: 'Defects' },
];

const LOADING = ['Searching weld database...', 'Checking code requirements...'];

export default function ReferencePage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('');
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    loadBrowse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadBrowse() {
    setLoading(true); setErr('');
    try {
      const qs = tab ? `?category=${encodeURIComponent(tab)}` : '';
      const res = await apiGet(`/reference/browse${qs}`);
      setItems(res.results || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setErr(''); setActive(null); setModel('');
    try {
      const res = await apiPost('/reference/query', { query });
      setActive(res.result);
      setModel(res.model || '');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function renderEntry(entry) {
    const content = entry.content_json || entry.content || {};
    return (
      <div className="card stack">
        <div>
          <h3>{entry.title} {model && <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#6B6B73' }}>{model}</span>}</h3>
          <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
            {[entry.process, entry.base_material, entry.specification].filter(Boolean).join(' • ')}
          </p>
        </div>
        {content.summary && <p>{content.summary}</p>}
        {Array.isArray(content.key_values) && content.key_values.length > 0 && (
          <div>
            {content.key_values.map((kv, i) => (
              <div key={i} className="row-between" style={{ borderBottom: '1px solid #2A2A2E', padding: '0.5rem 0' }}>
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{kv.label}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>{kv.value}</span>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(content.important_notes) && content.important_notes.length > 0 && (
          <div className="info-box">
            <strong>Notes:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', listStyle: 'disc' }}>
              {content.important_notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}
        {entry.disclaimer && <div className="warning-box">{entry.disclaimer}</div>}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reference</h1>
        <p className="text-secondary">WPS, codes, filler metals, and defect guides.</p>
      </div>

      <form onSubmit={search} className="stack" style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder='e.g. "Preheat for A36 with E7018"' value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn-primary btn-block" disabled={loading || !query.trim()}>Search</button>
      </form>

      <div className="chip-row" style={{ marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button key={t.label} className={`chip${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setActive(null); setModel(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      {err && <div className="error-banner">{err}</div>}
      {loading && <LoadingSpinner messages={LOADING} />}

      {!loading && active && (
        <div className="stack">
          {renderEntry(active)}
          <button className="btn btn-ghost btn-block" onClick={() => { setActive(null); setModel(''); }}>Back to browse</button>
        </div>
      )}

      {!loading && !active && (
        <div className="stack">
          {items.length === 0 && <p className="text-secondary text-center">No entries.</p>}
          {items.map((it) => (
            <div key={it.id} className="card" onClick={() => setActive(it)} style={{ cursor: 'pointer' }}>
              <div className="row-between">
                <div>
                  <h3 style={{ fontSize: '1rem' }}>{it.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    {[it.process, it.base_material, it.specification].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <span className="badge badge-orange">{(it.category || '').replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
