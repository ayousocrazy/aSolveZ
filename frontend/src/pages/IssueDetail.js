import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, getComments, createComment, deleteComment, vote, report, deleteIssue } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const REPORT_REASONS = ['spam','hate','misinformation','irrelevant','false_resolution','other'];

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
    <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 16px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>← Back</button>

      <div style={{ marginBottom: '8px' }}>
        <strong style={{ textTransform: 'capitalize' }}>{issue.category}</strong>
        {' · '}
        <span style={{ textTransform: 'capitalize' }}>{issue.status}</span>
        {' · '}
        <small>{new Date(issue.created_at).toLocaleString()}</small>
      </div>

      <p style={{ margin: '12px 0' }}>{issue.description}</p>

      {issue.locality && <p><small>Locality: {issue.locality}</small></p>}

      {issue.image && (
        <div style={{ margin: '12px 0' }}>
          <img src={issue.image} alt="Issue" style={{ maxWidth: '100%' }} />
        </div>
      )}
      {issue.video && (
        <div style={{ margin: '12px 0' }}>
          <video src={issue.video} controls style={{ maxWidth: '100%' }} />
        </div>
      )}

      {/* Voting */}
      {user && !user.is_ward_account && (
        <div style={{ margin: '16px 0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => handleVote(1)} style={{ fontWeight: userVote === 1 ? 'bold' : 'normal' }}>
            ▲ Upvote
          </button>
          <span>{voteScore ?? 0}</span>
          <button onClick={() => handleVote(-1)} style={{ fontWeight: userVote === -1 ? 'bold' : 'normal' }}>
            ▼ Downvote
          </button>
        </div>
      )}

      {/* Resolution */}
      {isCompleted && issue.resolution_note && (
        <div style={{ margin: '16px 0', padding: '12px', border: '1px solid #ccc' }}>
          <strong>Resolution</strong>
          <p>{issue.resolution_note}</p>
          {issue.resolution_image && <img src={issue.resolution_image} alt="Resolution" style={{ maxWidth: '100%' }} />}
          {issue.resolution_video && <video src={issue.resolution_video} controls style={{ maxWidth: '100%' }} />}
        </div>
      )}

      {/* Report */}
      {user && !user.is_ward_account && (
        <div style={{ margin: '16px 0' }}>
          <button onClick={() => setShowReport(!showReport)}>
            {isCompleted ? 'Re-flag (False Resolution)' : 'Report Issue'}
          </button>
          {showReport && (
            <form onSubmit={handleReport} style={{ marginTop: '8px' }}>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)} required>
                <option value="">Select reason</option>
                {REPORT_REASONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
              {' '}
              <input placeholder="Optional note" value={reportNote} onChange={e => setReportNote(e.target.value)} />
              {' '}
              <button type="submit">Submit Report</button>
            </form>
          )}
          {reportMsg && <p style={{ color: 'green' }}>{reportMsg}</p>}
        </div>
      )}

      {canDelete && (
        <button onClick={handleDelete} style={{ marginBottom: '16px' }}>Delete Issue</button>
      )}

      <ErrorBox error={error} />

      {/* Comments */}
      <div style={{ marginTop: '32px' }}>
        <h3>Comments ({comments.length})</h3>
        {comments.map(c => (
          <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
            <strong>{c.author_name || 'User'}</strong>
            <small style={{ marginLeft: '8px', color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
            <p style={{ margin: '4px 0' }}>{c.text}</p>
            {user && (user.id === c.author || user.is_moderator) && (
              <button onClick={() => handleDeleteComment(c.id)} style={{ fontSize: '0.8em' }}>Delete</button>
            )}
          </div>
        ))}

        {user && (
          <form onSubmit={handleComment} style={{ marginTop: '16px' }}>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              style={{ width: '100%' }}
            />
            <br />
            <button type="submit" style={{ marginTop: '8px' }}>Post Comment</button>
          </form>
        )}
      </div>
    </div>
  );
}
