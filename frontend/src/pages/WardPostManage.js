import React, { useState, useEffect } from 'react';
import { getWardPosts, createWardPost, deleteWardPost } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const POST_TYPES = ['announcement', 'project', 'event', 'update'];

export default function WardPostManage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', post_type: 'update' });
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  const load = () => {
    getWardPosts(user?.ward)
      .then(d => { setPosts(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('body', form.body);
    fd.append('post_type', form.post_type);
    if (image) fd.append('image', image);
    if (video) fd.append('video', video);
    try {
      await createWardPost(fd);
      setSuccess(true);
      setShowForm(false);
      setForm({ title: '', body: '', post_type: 'update' });
      setImage(null);
      setVideo(null);
      load();
    } catch (e) {
      setFormError(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteWardPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  return (
    <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Ward Posts</h2>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Post'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ padding: '16px', border: '1px solid #ccc', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0 }}>Create Post</h3>
          <div style={{ marginBottom: '12px' }}>
            <label>Post Type</label><br />
            <select value={form.post_type} onChange={set('post_type')}>
              {POST_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>Title *</label><br />
            <input value={form.title} onChange={set('title')} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>Body *</label><br />
            <textarea value={form.body} onChange={set('body')} required rows={5} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>Image (optional)</label><br />
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>Video (optional)</label><br />
            <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
          </div>
          <ErrorBox error={formError} />
          <button type="submit">Publish</button>
        </form>
      )}

      {success && <p style={{ color: 'green' }}>Post published.</p>}
      <ErrorBox error={error} />
      {loading && <Spinner />}

      {!loading && posts.length === 0 && <p>No posts yet. Create your first one!</p>}

      {posts.map(post => (
        <div key={post.id} style={{ borderBottom: '1px solid #ddd', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{post.title}</strong>
              {' '}
              <span style={{ fontSize: '0.8em', textTransform: 'capitalize' }}>({post.post_type?.replace('_', ' ')})</span>
              <br />
              <small>{new Date(post.created_at).toLocaleString()}</small>
              <p style={{ margin: '8px 0' }}>{post.body}</p>
              {post.image && <img src={post.image} alt="Post" style={{ maxWidth: '100%' }} />}
            </div>
            <button onClick={() => handleDelete(post.id)} style={{ marginLeft: '16px', whiteSpace: 'nowrap' }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
