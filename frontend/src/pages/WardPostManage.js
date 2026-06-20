import React, { useState, useEffect } from 'react';
import { getWardPosts, createWardPost, deleteWardPost } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const POST_TYPES = ['announcement', 'project', 'event', 'update'];

function prettyKey(value) {
  return value.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
    <main className="page-shell page-pad">
      <div className="card" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h1 className="page-heading">Ward Posts</h1>
            <p className="body-copy">Share announcements and updates with your ward residents.</p>
          </div>
          <button type="button" className="button-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Post'}
          </button>
        </div>

        {showForm && (
          <div className="form-card" style={{ marginBottom: '24px' }}>
            <h2 className="section-heading">Create Post</h2>
            <form onSubmit={handleCreate} className="form-fieldset">
              <label className="label">
                Post Type
                <select className="select-field" value={form.post_type} onChange={set('post_type')}>
                  {POST_TYPES.map(t => <option key={t} value={t}>{prettyKey(t)}</option>)}
                </select>
              </label>
              <label className="label">
                Title *
                <input className="input-field" value={form.title} onChange={set('title')} required />
              </label>
              <label className="label">
                Body *
                <textarea className="textarea-field" value={form.body} onChange={set('body')} required rows={5} />
              </label>
              <label className="label">
                Image (optional)
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
              </label>
              <label className="label">
                Video (optional)
                <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
              </label>
              <ErrorBox error={formError} />
              <button type="submit" className="button-primary">Publish</button>
            </form>
          </div>
        )}

        {success && <p className="body-copy" style={{ color: 'var(--color-green)', marginBottom: '18px' }}>Post published.</p>}
        <ErrorBox error={error} />
        {loading && <Spinner />}

        {!loading && posts.length === 0 && (
          <div className="empty-state-card">
            <p className="screen-title">No posts yet</p>
            <p className="body-copy">Create your first ward update to keep the community informed.</p>
          </div>
        )}

        <div className="post-list">
          {posts.map(post => (
            <article key={post.id} className="post-card">
              <div className="feed-card-title">
                <strong>{post.title}</strong>
                <small>({prettyKey(post.post_type)})</small>
              </div>
              <div className="feed-card-meta">
                <span>{new Date(post.created_at).toLocaleString()}</span>
              </div>
              <p className="feed-card-copy">{post.body}</p>
              {post.image && <img src={post.image} alt="Post" />}
              {post.video && <video src={post.video} controls />}
              <div className="post-actions">
                <button type="button" className="button-secondary" onClick={() => handleDelete(post.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
