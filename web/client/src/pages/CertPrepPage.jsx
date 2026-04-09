import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CERTS = ['CW', 'CAWI', 'CWI'];
const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'visual_inspection', label: 'Visual Inspection' },
  { key: 'codes_standards', label: 'Codes & Standards' },
  { key: 'weld_symbols', label: 'Weld Symbols' },
  { key: 'metallurgy', label: 'Metallurgy' },
  { key: 'processes', label: 'Processes' },
  { key: 'safety', label: 'Safety' },
  { key: 'ndt', label: 'NDT' },
];

export default function CertPrepPage() {
  const [cert, setCert] = useState('CWI');
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [streak, setStreak] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => { loadProgress(); }, []);

  async function loadProgress() {
    try {
      const res = await apiGet('/cert/progress');
      setProgress(res.progress || []);
    } catch {}
  }

  async function startSession() {
    setLoading(true); setErr(''); setQuestions([]); setIdx(0); setFeedback(null); setSelected(null);
    try {
      const qs = new URLSearchParams({ cert_level: cert, limit: 10 });
      if (category) qs.set('category', category);
      const res = await apiGet(`/cert/questions?${qs.toString()}`);
      if (!res.questions || res.questions.length === 0) {
        setErr('No questions in this bank yet. Try a different category or generate more.');
      } else {
        setQuestions(res.questions);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(letter) {
    if (feedback) return;
    setSelected(letter);
    try {
      const q = questions[idx];
      const res = await apiPost('/cert/answer', {
        question_id: q.id,
        selected: letter,
        cert_level: cert,
        category: q.category,
      });
      setFeedback(res);
      setStreak((s) => (res.correct ? s + 1 : 0));
    } catch (e) {
      setErr(e.message);
    }
  }

  function nextQuestion() {
    setSelected(null);
    setFeedback(null);
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
    } else {
      setQuestions([]);
      setIdx(0);
      loadProgress();
    }
  }

  async function generateMore() {
    setLoading(true); setErr('');
    try {
      await apiPost('/cert/generate', { cert_level: cert, category: category || 'codes_standards', count: 5 });
      await startSession();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentProgress = progress.find((p) => p.cert_level === cert);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cert Prep</h1>
        <p className="text-secondary">AWS certification practice questions.</p>
      </div>

      {questions.length === 0 && !loading && (
        <div className="stack">
          <div className="form-group">
            <label>Certification</label>
            <div className="chip-row">
              {CERTS.map((c) => (
                <button key={c} className={`chip${cert === c ? ' active' : ''}`} onClick={() => setCert(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Category</label>
            <div className="chip-row">
              {CATEGORIES.map((c) => (
                <button key={c.label} className={`chip${category === c.key ? ' active' : ''}`} onClick={() => setCategory(c.key)}>{c.label}</button>
              ))}
            </div>
          </div>

          {currentProgress && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Your {cert} progress</h3>
              <p>Attempted: <strong>{currentProgress.questions_attempted}</strong></p>
              <p>Correct: <strong>{currentProgress.questions_correct}</strong> ({currentProgress.questions_attempted ? Math.round((currentProgress.questions_correct / currentProgress.questions_attempted) * 100) : 0}%)</p>
              {currentProgress.weak_categories?.length > 0 && (
                <p className="text-danger" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Weak: {currentProgress.weak_categories.join(', ')}
                </p>
              )}
            </div>
          )}

          {err && <div className="error-banner">{err}</div>}

          <button className="btn btn-primary btn-block" onClick={startSession}>Start practice</button>
          <button className="btn btn-secondary btn-block" onClick={generateMore}>Generate more questions (AI)</button>
        </div>
      )}

      {loading && <LoadingSpinner message="Loading questions..." />}

      {!loading && questions.length > 0 && (
        <div className="stack">
          <div className="row-between">
            <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>Question {idx + 1} of {questions.length}</span>
            <span className="badge badge-orange">{(questions[idx].category || '').replace(/_/g, ' ')}</span>
          </div>

          <div className="card question-card">
            <p className="question-text">{questions[idx].question}</p>
            {['A', 'B', 'C', 'D'].map((letter) => {
              const opt = questions[idx][`option_${letter.toLowerCase()}`];
              const isCorrect = feedback && letter === feedback.correct_answer;
              const isWrong = feedback && letter === selected && !feedback.correct;
              return (
                <button
                  key={letter}
                  className={`option-btn${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}`}
                  onClick={() => submitAnswer(letter)}
                  disabled={!!feedback}
                >
                  <span className="option-letter">{letter}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className={feedback.correct ? 'info-box' : 'error-banner'}>
              <strong>{feedback.correct ? 'Correct.' : 'Incorrect.'}</strong>
              <p style={{ marginTop: '0.5rem' }}>{feedback.explanation}</p>
              {feedback.code_reference && <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>Reference: {feedback.code_reference}</p>}
            </div>
          )}

          {feedback && (
            <button className="btn btn-primary btn-block" onClick={nextQuestion}>
              {idx + 1 < questions.length ? 'Next question' : 'Finish session'}
            </button>
          )}

          <p className="text-secondary text-center" style={{ fontSize: '0.875rem' }}>Streak: {streak}</p>
        </div>
      )}
    </div>
  );
}
