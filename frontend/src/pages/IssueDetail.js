import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, getComments, createComment, deleteComment, vote, report, deleteIssue } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const REPORT_REASONS = ['spam','hate','misinformation','irrelevant','false_resolution','other'];

function prettyKey(value) {
  return value.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IssueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voteScore, setVoteScore] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportMsg, setReportMsg] = useState('');
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    try {
      const [iss, cmts] = await Promise.all([getIssue(id), getComments(id)]);
      setIssue(iss);
      setVoteScore(iss.vote_score);
      setUserVote(iss.user_vote ?? null);
      setComments(cmts.results || cmts);
    } catch (e) { setError(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleVote = async (val) => {
    if (!user) return;
    try {
      const res = await vote(id, val);
      setVoteScore(res.vote_score);
      setUserVote(res.user_vote === userVote ? null : res.user_vote);
    } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await createComment(id, commentText);
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch (e) { setError(e); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  };

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await report('issue', id, reportReason, reportNote);
      setReportMsg('Report submitted.');
      setShowReport(false);
    } catch (e) { setReportMsg('Error submitting report.'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue?')) return;
    try {
      await deleteIssue(id);
      navigate('/issues');
    } catch {}
  };

  if (loading) return <Spinner />;
  if (!issue) return <ErrorBox error={error || 'Issue not found.'} />;

  const canDelete = user && (user.id === issue.author || user.is_moderator);
  const isCompleted = issue.status === 'completed';

  return (
    <main className="page-shell page-pad">
      <div className="detail-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <button type="button" className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <div className="detail-header">
          <div className="issue-card-title" style={{ gap: '12px' }}>
            <strong>{prettyKey(issue.category)}</strong>
            <span className={`status-chip status-${issue.status || 'other'}`}>{prettyKey(issue.status || 'unknown')}</span>
          </div>
          <div className="detail-meta">
            <small>{new Date(issue.created_at).toLocaleString()}</small>
            {issue.locality && <small>Locality: {issue.locality}</small>}
          </div>
        </div>

        <p className="detail-body">{issue.description}</p>

        {issue.image && <div className="detail-media"><img src={issue.image} alt="Issue" /></div>}
        {issue.video && <div className="detail-media"><video src={issue.video} controls /></div>}

        {user && !user.is_ward_account && (
          <div className="review-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="button-secondary" onClick={() => handleVote(1)} style={{ fontWeight: userVote === 1 ? 700 : 500 }}>▲ Upvote</button>
            <span className="small-copy">{voteScore ?? 0} votes</span>
            <button type="button" className="button-secondary" onClick={() => handleVote(-1)} style={{ fontWeight: userVote === -1 ? 700 : 500 }}>▼ Downvote</button>
          </div>
        )}

        {isCompleted && issue.resolution_note && (
          <div className="form-card" style={{ marginTop: '24px' }}>
            <h2 className="section-heading">Resolution</h2>
            <p className="body-copy">{issue.resolution_note}</p>
            {issue.resolution_image && <div className="detail-media"><img src={issue.resolution_image} alt="Resolution" /></div>}
            {issue.resolution_video && <div className="detail-media"><video src={issue.resolution_video} controls /></div>}
          </div>
        )}

        {user && !user.is_ward_account && (
          <div className="form-card" style={{ marginTop: '24px' }}>
            <button type="button" className="button-secondary" onClick={() => setShowReport(!showReport)}>
              {isCompleted ? 'Re-flag False Resolution' : 'Report Issue'}
            </button>
            {showReport && (
              <form onSubmit={handleReport} className="form-fieldset" style={{ marginTop: '18px' }}>
                <label className="label">
                  Report reason
                  <select className="select-field" value={reportReason} onChange={e => setReportReason(e.target.value)} required>
                    <option value="">Select reason</option>
                    {REPORT_REASONS.map(r => <option key={r} value={r}>{prettyKey(r)}</option>)}
                  </select>
                </label>
                <label className="label">
                  Notes
                  <textarea className="textarea-field" placeholder="Optional note" value={reportNote} onChange={e => setReportNote(e.target.value)} rows={3} />
                </label>
                <button type="submit" className="button-primary">Submit Report</button>
              </form>
            )}
            {reportMsg && <p className="body-copy" style={{ color: 'var(--color-green)', marginTop: '12px' }}>{reportMsg}</p>}
          </div>
        )}

        {canDelete && (
          <button type="button" className="button-tertiary" onClick={handleDelete} style={{ marginTop: '20px' }}>Delete Issue</button>
        )}

        <ErrorBox error={error} />

        <div className="comment-list" style={{ marginTop: '32px' }}>
          <h2 className="section-heading">Comments ({comments.length})</h2>
          {comments.length === 0 && <p className="body-copy">No comments yet.</p>}
          {comments.map(c => (
            <article key={c.id} className="comment-card">
              <div className="comment-meta">
                <strong>{c.author_name || 'User'}</strong>
                <small>{new Date(c.created_at).toLocaleString()}</small>
              </div>
              <p className="body-copy">{c.text}</p>
              {user && (user.id === c.author || user.is_moderator) && (
                <button type="button" className="button-tertiary" onClick={() => handleDeleteComment(c.id)} style={{ width: 'fit-content' }}>Delete</button>
              )}
            </article>
          ))}
          {user && (
            <form onSubmit={handleComment} className="comment-form">
              <label className="label">
                Add a comment
                <textarea className="textarea-field" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" rows={3} />
              </label>
              <button type="submit" className="button-primary">Post Comment</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
