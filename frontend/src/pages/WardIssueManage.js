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
    <div style={{ maxWidth: '640px', margin: '32px auto', padding: '0 16px' }}>
      <button onClick={() => navigate('/ward/issues')} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>Manage Issue #{issue.id}</h2>

      <div style={{ marginBottom: '16px' }}>
        <strong style={{ textTransform: 'capitalize' }}>{issue.category}</strong>
        {' · '}
        <span style={{ textTransform: 'capitalize' }}>{issue.status}</span>
        <p>{issue.description}</p>
        {issue.locality && <p><small>Locality: {issue.locality}</small></p>}
        {issue.image && <img src={issue.image} alt="Issue" style={{ maxWidth: '100%' }} />}
        {issue.video && <video src={issue.video} controls style={{ maxWidth: '100%' }} />}
        <p><small>Submitted: {new Date(issue.created_at).toLocaleString()}</small></p>
        <p><small>Votes: {issue.vote_score ?? 0}</small></p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>Status *</label><br />
          <select value={status} onChange={e => setStatus(e.target.value)} required>
            {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
          </select>
        </div>

        {status === 'completed' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label>Resolution Note {status === 'completed' ? '*' : ''}</label><br />
              <textarea value={resNote} onChange={e => setResNote(e.target.value)} rows={4} style={{ width: '100%' }} required={status === 'completed'} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label>Resolution Image</label><br />
              <input type="file" accept="image/*" onChange={e => setResImage(e.target.files[0])} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label>Resolution Video</label><br />
              <input type="file" accept="video/*" onChange={e => setResVideo(e.target.files[0])} />
            </div>
          </>
        )}

        {success && <p style={{ color: 'green' }}>Issue updated successfully.</p>}
        <ErrorBox error={error} />
        <button type="submit">Save Changes</button>
      </form>

      {/* Comments */}
      <div style={{ marginTop: '32px' }}>
        <h3>Comments ({comments.length})</h3>
        {comments.map(c => (
          <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
            <strong>{c.author_name || 'User'}</strong>
            <small style={{ marginLeft: '8px', color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
            <p style={{ margin: '4px 0' }}>{c.text}</p>
          </div>
        ))}
        {comments.length === 0 && <p>No comments yet.</p>}
      </div>
    </div>
  );
}
