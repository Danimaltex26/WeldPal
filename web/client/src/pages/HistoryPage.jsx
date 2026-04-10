import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiDelete } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

function assessmentBadgeClass(value) {
  if (!value) return 'badge badge-gray';
  const lower = String(value).toLowerCase();
  if (lower.includes('accept')) return 'badge badge-green';
  if (lower.includes('reject')) return 'badge badge-red';
  if (lower.includes('repair') || lower.includes('further')) return 'badge badge-amber';
  return 'badge badge-gray';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractTsSummary(item) {
  if (!item.conversation_json || item.conversation_json.length === 0) return null;
  for (let i = item.conversation_json.length - 1; i >= 0; i--) {
    const msg = item.conversation_json[i];
    if (msg.role === 'assistant') {
      try {
        const jsonMatch = (msg.content || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.plain_english_summary || parsed.summary || null;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

export default function HistoryPage() {
  const [tab, setTab] = useState('weld'); // weld | troubleshoot
  const [weldItems, setWeldItems] = useState([]);
  const [tsItems, setTsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/history');
      setWeldItems(Array.isArray(data?.weld_analyses) ? data.weld_analyses : []);
      setTsItems(Array.isArray(data?.troubleshoot_sessions) ? data.troubleshoot_sessions : []);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setTitleDraft(item.title || '');
    setNotesDraft(item.notes || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setTitleDraft('');
    setNotesDraft('');
  }

  async function saveNotes(type, item) {
    const nextTitle = titleDraft.trim() || null;
    const nextNotes = notesDraft.trim() || null;
    setSavingNotes(true);
    try {
      await apiPatch(`/history/${type}/${item.id}`, { title: nextTitle, notes: nextNotes });
      const setter = type === 'weld' ? setWeldItems : setTsItems;
      setter((prev) => prev.map((x) => x.id === item.id ? { ...x, title: nextTitle, notes: nextNotes } : x));
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleResolve(id) {
    try {
      await apiPatch(`/history/troubleshoot/${id}/resolve`);
      setTsItems((prev) => prev.map((x) => x.id === id ? { ...x, resolved: true } : x));
    } catch (err) {
      setError(err.message || 'Failed to mark as resolved');
    }
  }

  async function handleDelete(type, id) {
    if (!confirm('Delete this item?')) return;
    try {
      await apiDelete(`/history/${type}/${id}`);
      if (type === 'weld') {
        setWeldItems((prev) => prev.filter((x) => x.id !== id));
      } else {
        setTsItems((prev) => prev.filter((x) => x.id !== id));
      }
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  }

  return (
    <div className="page">
      <div className="stack">
        <div className="page-header">
          <h2>History</h2>
        </div>

        <div className="toggle-group">
          <button
            className={`toggle-option${tab === 'weld' ? ' active' : ''}`}
            onClick={() => setTab('weld')}
          >
            Weld Analyses
          </button>
          <button
            className={`toggle-option${tab === 'troubleshoot' ? ' active' : ''}`}
            onClick={() => setTab('troubleshoot')}
          >
            Troubleshoot
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <LoadingSpinner message="Loading history..." />
        ) : tab === 'weld' ? (
          weldItems.length === 0 ? (
            <p className="text-secondary text-center" style={{ padding: '2rem 0' }}>
              No weld analyses saved yet.
            </p>
          ) : (
            <div className="stack-sm">
              {weldItems.map((item) => (
                <div key={item.id} className="card" style={{ padding: 0 }}>
                  <div
                    className="expandable-header"
                    style={{ padding: '0.875rem 1rem' }}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                        {item.title || formatDate(item.created_at)}
                      </p>
                      {item.title && (
                        <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          {formatDate(item.created_at)}
                        </p>
                      )}
                      <div className="row" style={{ gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {item.overall_assessment && (
                          <span className={assessmentBadgeClass(item.overall_assessment)}>
                            {item.overall_assessment}
                          </span>
                        )}
                        {item.confidence && (
                          <span className="badge badge-gray">{item.confidence}</span>
                        )}
                        {item.weld_process && (
                          <span className="badge badge-blue">{item.weld_process}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: '#6B6B73', fontSize: '1.25rem' }}>
                      {expandedId === item.id ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>

                  {expandedId === item.id && (
                    <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #2A2A2E' }}>
                      <div className="stack-sm" style={{ paddingTop: '0.75rem' }}>
                        {item.base_material && (
                          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
                            Base material: {item.base_material}
                          </p>
                        )}
                        {item.full_response_json?.plain_english_summary && (
                          <p style={{ fontSize: '0.9375rem' }}>
                            {item.full_response_json.plain_english_summary}
                          </p>
                        )}

                        {editingId === item.id ? (
                          <div className="stack-sm" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              className="input"
                              placeholder="Add a title..."
                              value={titleDraft}
                              onChange={(e) => setTitleDraft(e.target.value)}
                            />
                            <textarea
                              className="input"
                              placeholder="Add notes about this entry..."
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              rows={4}
                              style={{ resize: 'vertical' }}
                            />
                          </div>
                        ) : (
                          item.notes && (
                            <div className="card" style={{ background: '#1A1A1E', padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.notes}
                            </div>
                          )
                        )}

                        <div className="row" style={{ gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {editingId === item.id ? (
                            <>
                              <button
                                className="btn btn-ghost"
                                style={{ minHeight: 40, fontSize: '0.875rem' }}
                                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                disabled={savingNotes}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn-primary"
                                style={{ minHeight: 40, fontSize: '0.875rem' }}
                                onClick={(e) => { e.stopPropagation(); saveNotes('weld', item); }}
                                disabled={savingNotes}
                              >
                                {savingNotes ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ minHeight: 40, fontSize: '0.875rem' }}
                              onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                            >
                              {item.title || item.notes ? 'Edit Title & Notes' : 'Add Title & Notes'}
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            style={{ minHeight: 40, fontSize: '0.875rem' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete('weld', item.id); }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          tsItems.length === 0 ? (
            <p className="text-secondary text-center" style={{ padding: '2rem 0' }}>
              No troubleshoot sessions saved yet.
            </p>
          ) : (
            <div className="stack-sm">
              {tsItems.map((item) => (
                <div key={item.id} className="card" style={{ padding: 0 }}>
                  <div
                    className="expandable-header"
                    style={{ padding: '0.875rem 1rem' }}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                        {item.title || formatDate(item.created_at)}
                      </p>
                      {item.title && (
                        <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          {formatDate(item.created_at)}
                        </p>
                      )}
                      <div className="row" style={{ gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {item.weld_process && <span className="badge badge-blue">{item.weld_process}</span>}
                        {item.position && <span className="badge badge-gray">{item.position}</span>}
                        {item.resolved != null && (
                          <span className={`badge ${item.resolved ? 'badge-green' : 'badge-amber'}`}>
                            {item.resolved ? 'Resolved' : 'Open'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: '#6B6B73', fontSize: '1.25rem' }}>
                      {expandedId === item.id ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>

                  {expandedId === item.id && (
                    <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #2A2A2E' }}>
                      <div className="stack-sm" style={{ paddingTop: '0.75rem' }}>
                        {item.symptom && (
                          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
                            Symptom: {item.symptom}
                          </p>
                        )}
                        {extractTsSummary(item) && (
                          <p style={{ fontSize: '0.9375rem' }}>{extractTsSummary(item)}</p>
                        )}

                        {editingId === item.id ? (
                          <div className="stack-sm" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              className="input"
                              placeholder="Add a title..."
                              value={titleDraft}
                              onChange={(e) => setTitleDraft(e.target.value)}
                            />
                            <textarea
                              className="input"
                              placeholder="Add notes about this entry..."
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              rows={4}
                              style={{ resize: 'vertical' }}
                            />
                          </div>
                        ) : (
                          item.notes && (
                            <div className="card" style={{ background: '#1A1A1E', padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.notes}
                            </div>
                          )
                        )}

                        <div className="row" style={{ gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {editingId === item.id ? (
                            <>
                              <button
                                className="btn btn-ghost"
                                style={{ minHeight: 40, fontSize: '0.875rem' }}
                                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                disabled={savingNotes}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn-primary"
                                style={{ minHeight: 40, fontSize: '0.875rem' }}
                                onClick={(e) => { e.stopPropagation(); saveNotes('troubleshoot', item); }}
                                disabled={savingNotes}
                              >
                                {savingNotes ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ minHeight: 40, fontSize: '0.875rem' }}
                                onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                              >
                                {item.title || item.notes ? 'Edit Title & Notes' : 'Add Title & Notes'}
                              </button>
                              {!item.resolved && (
                                <button
                                  className="btn btn-primary"
                                  style={{ minHeight: 40, fontSize: '0.875rem' }}
                                  onClick={(e) => { e.stopPropagation(); handleResolve(item.id); }}
                                >
                                  Mark Resolved
                                </button>
                              )}
                            </>
                          )}
                          <button
                            className="btn btn-danger"
                            style={{ minHeight: 40, fontSize: '0.875rem' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete('troubleshoot', item.id); }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
