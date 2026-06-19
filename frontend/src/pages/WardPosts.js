import React, { useState, useEffect } from 'react';
import { getWardPosts } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

export default function WardPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const wardId = user?.ward || '';
    getWardPosts(wardId)
      .then(d => { setPosts(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [user]);

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 16px' }}>
      <h2>Ward Feed</h2>
      <ErrorBox error={error} />
      {posts.length === 0 && <p>No posts from your ward yet.</p>}
      {posts.map(post => (
        <div key={post.id} style={{ borderBottom: '1px solid #ddd', padding: '16px 0' }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>{post.title}</strong>
            {' '}
            <span style={{ fontSize: '0.8em', textTransform: 'capitalize' }}>({post.post_type?.replace('_', ' ')})</span>
          </div>
          <small style={{ color: '#555' }}>{new Date(post.created_at).toLocaleString()}</small>
          <p style={{ margin: '8px 0' }}>{post.body}</p>
          {post.image && <img src={post.image} alt="Post" style={{ maxWidth: '100%', marginTop: '8px' }} />}
          {post.video && <video src={post.video} controls style={{ maxWidth: '100%', marginTop: '8px' }} />}
        </div>
      ))}
    </div>
  );
}
