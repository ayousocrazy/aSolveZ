import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, updateWardIssue, getComments } from '../api';
import { Spinner, ErrorBox } from '../components/Common';

const STATUSES = ['pending', 'acknowledged', 'completed'];

export default function WardIssueManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [resNote, setResNote] = useState('');
  const [resImage, setResImage] = useState(null);
  const [resVideo, setResVideo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([getIssue(id), getComments(id)])
      .then(([iss, cmts]) => {
        setIssue(iss);
        setStatus(iss.status);
        setResNote(iss.resolution_note || '');
        setComments(cmts.results || cmts);
        setLoading(false);
      })
      .catch(e => { setError(e); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.append('status', status);
    if (resNote) fd.append('resolution_note', resNote);
    if (resImage) fd.append('resolution_image', resImage);
    if (resVideo) fd.append('resolution_video', resVideo);
    try {
      await updateWardIssue(id, fd);
      setSuccess(true);
    } catch (e) {
      setError(e);
    }
  };

  if (loading) return <Spinner />;
  if (!issue) return <ErrorBox error={error || 'Not found'} />;

  return (
    <main className="page-shell page-pad">
      <div className="card" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button type="button" className="back-button" onClick={() => navigate('/ward/issues')}>
          ← Back
        </button>
        <div className="detail-header">
          <div>
            <h1 className="page-heading">Manage Issue #{issue.id}</h1>
            <div className="detail-meta" style={{ gap: '14px', marginTop: '8px' }}>
              <span>{issue.category}</span>
              <span>{issue.status}</span>
              <span>Submitted: {new Date(issue.created_at).toLocaleDateString()}</span>
              <span>Votes: {issue.vote_score ?? 0}</span>
            </div>
          </div>
        </div>

        <p className="body-copy" style={{ marginTop: '12px' }}>{issue.description}</p>
        {issue.locality && <p className="body-copy">Locality: {issue.locality}</p>}
        {issue.image && <div className="detail-media"><img src={issue.image} alt="Issue" /></div>}
        {issue.video && <div className="detail-media"><video src={issue.video} controls /></div>}

        <form onSubmit={handleSubmit} className="form-fieldset" style={{ marginTop: '24px' }}>
          <label className="label">
            Status *
            <select className="select-field" value={status} onChange={e => setStatus(e.target.value)} required>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </label>

          {status === 'completed' && (
            <>
              <label className="label">
                Resolution Note *
                <textarea className="textarea-field" value={resNote} onChange={e => setResNote(e.target.value)} rows={4} required={status === 'completed'} />
              </label>
              <label className="label">
                Resolution Image
                <input type="file" accept="image/*" onChange={e => setResImage(e.target.files[0])} />
              </label>
              <label className="label">
                Resolution Video
                <input type="file" accept="video/*" onChange={e => setResVideo(e.target.files[0])} />
              </label>
            </>
          )}

          {success && <p className="body-copy" style={{ color: 'var(--color-green)' }}>Issue updated successfully.</p>}
          <ErrorBox error={error} />
          <button type="submit" className="button-primary">Save Changes</button>
        </form>

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
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
