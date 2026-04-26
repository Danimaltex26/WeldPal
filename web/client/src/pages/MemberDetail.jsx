import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MemberDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/teams/member/${userId}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load member'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner message="Loading member details..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page stack">
        <div className="error-banner">{error || 'Member not found'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { profile, joined_at, readiness, recent_weld, recent_troubleshoot, training_progress } = data;

  return (
    <div className="page stack">
      {/* Back button */}
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/dashboard')}
        style={{ alignSelf: 'flex-start', padding: '0.25rem 0', gap: '0.25rem', display: 'flex', alignItems: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Dashboard
      </button>

      {/* Profile header */}
      <div className="card">
        <div className="row" style={{ gap: '0.75rem', alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#2A2A2E', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700,
            color: '#A0A0A8', flexShrink: 0,
          }}>
            {(profile.display_name || profile.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '1.0625rem', margin: 0 }}>
              {profile.display_name || profile.email}
            </p>
            <p className="text-secondary" style={{ fontSize: '0.8125rem', margin: 0 }}>{profile.email}</p>
            <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
              Joined {new Date(joined_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Cert Readiness */}
      {readiness.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Certification Readiness</h3>
          <div className="stack-sm">
            {readiness.map((r) => (
              <div key={r.cert_level}>
                <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.cert_level}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {r.estimated_pass && <span className="badge badge-green">Exam Ready</span>}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {Math.round(r.overall_readiness_percent)}%
                    </span>
                  </div>
                </div>
                <div style={{
                  height: 6, borderRadius: 3, background: '#2A2A2E', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(r.overall_readiness_percent, 100)}%`,
                    background: r.overall_readiness_percent >= 75 ? '#10B981' : '#F97316',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Summary */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Recent Activity</h3>
        <div className="stack-sm">
          <div className="row-between">
            <span className="text-secondary">Weld Analyses</span>
            <span style={{ fontWeight: 600 }}>{recent_weld.length}</span>
          </div>
          <div className="row-between">
            <span className="text-secondary">Troubleshoot Sessions</span>
            <span style={{ fontWeight: 600 }}>{recent_troubleshoot.length}</span>
          </div>
        </div>
      </div>

      {/* Recent Weld Analyses */}
      {recent_weld.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>Recent Analyses</h3>
          <div className="stack-sm">
            {recent_weld.slice(0, 10).map((r) => (
              <AnalysisCard key={r.id} result={r} />
            ))}
          </div>
        </div>
      )}

      {/* Training Progress */}
      {training_progress.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Training Progress</h3>
          <div className="stack-sm">
            {training_progress.map((tp) => (
              <div key={tp.id} className="row-between" style={{ minHeight: 36 }}>
                <div>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    {tp.training_modules?.title || tp.cert_level}
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                    {tp.cert_level} {tp.status !== 'not_started' ? `\u00b7 ${tp.status.replace(/_/g, ' ')}` : ''}
                  </p>
                </div>
                {tp.last_practice_score_percent != null && (
                  <span className="text-secondary" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {Math.round(tp.last_practice_score_percent)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function assessmentBadgeClass(val) {
  if (!val) return 'badge badge-gray';
  if (val === 'accept' || val === 'pass' || val === 'acceptable') return 'badge badge-green';
  if (val === 'reject' || val === 'fail' || val === 'repair' || val === 'severe') return 'badge badge-red';
  return 'badge badge-amber';
}

function AnalysisCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const json = result.full_response_json;
  const assessment = json?.overall_assessment;
  const defects = json?.defects || [];
  const codeRefs = json?.code_references || [];
  const ctx = json?.detected_context;

  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Summary row */}
      <div className="row-between" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>
            {result.diagnosis
              ? result.diagnosis.substring(0, 80) + (result.diagnosis.length > 80 ? '...' : '')
              : 'Weld Analysis'}
          </p>
          <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
            {new Date(result.created_at).toLocaleDateString()}
            {ctx?.likely_process && ` \u00b7 ${ctx.likely_process}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {assessment && (
            <span className={assessmentBadgeClass(assessment)}>
              {assessment.replace(/_/g, ' ')}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && json && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #2A2A2E', paddingTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
          {/* Assessment reasoning */}
          {json.assessment_reasoning && (
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              {json.assessment_reasoning}
            </p>
          )}

          {/* Detected context */}
          {ctx && (ctx.likely_process || ctx.likely_material || ctx.likely_position) && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#A0A0A8' }}>Detected</h4>
              <div className="stack-sm">
                {ctx.likely_process && (
                  <div className="row-between">
                    <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Process</span>
                    <span style={{ fontSize: '0.8125rem' }}>{ctx.likely_process}</span>
                  </div>
                )}
                {ctx.likely_material && (
                  <div className="row-between">
                    <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Material</span>
                    <span style={{ fontSize: '0.8125rem' }}>{ctx.likely_material}</span>
                  </div>
                )}
                {ctx.likely_position && (
                  <div className="row-between">
                    <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Position</span>
                    <span style={{ fontSize: '0.8125rem' }}>{ctx.likely_position}</span>
                  </div>
                )}
                {ctx.likely_joint_type && (
                  <div className="row-between">
                    <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Joint Type</span>
                    <span style={{ fontSize: '0.8125rem' }}>{ctx.likely_joint_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Defects */}
          {defects.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#A0A0A8' }}>Defects Identified</h4>
              {defects.map((d, i) => (
                <div key={i} style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: '0.5rem' }}>
                  <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.8125rem' }}>{(d.type || d.defect_type || '').replace(/_/g, ' ')}</strong>
                    <span className={assessmentBadgeClass(d.severity)}>{d.severity}</span>
                  </div>
                  {d.location && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Location: {d.location}</p>}
                  {d.probable_cause && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Cause: {d.probable_cause}</p>}
                  {d.corrective_action && <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#F97316' }}>Fix: {d.corrective_action}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Code references */}
          {codeRefs.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#A0A0A8' }}>Code References</h4>
              {codeRefs.map((ref, i) => (
                <div key={i} style={{ fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <strong>{ref.standard}</strong>
                  {ref.clause && <span className="text-muted"> \u00b7 {ref.clause}</span>}
                  {ref.requirement && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>{ref.requirement}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Parameter adjustments */}
          {json.parameter_adjustments && Object.keys(json.parameter_adjustments).length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#A0A0A8' }}>Parameter Adjustments</h4>
              <div className="stack-sm">
                {Object.entries(json.parameter_adjustments).map(([key, val]) => (
                  val && (
                    <div key={key} className="row-between">
                      <span className="text-muted" style={{ fontSize: '0.8125rem' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '0.8125rem' }}>{val}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          {json.confidence && (
            <div className="row-between" style={{ fontSize: '0.75rem' }}>
              <span className="text-muted">Confidence</span>
              <span className={assessmentBadgeClass(json.confidence)}>{json.confidence}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
