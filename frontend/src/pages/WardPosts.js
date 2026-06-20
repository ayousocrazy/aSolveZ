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
    <main className="page-shell page-pad">
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 className="page-heading">Ward Feed</h1>
        <p className="body-copy" style={{ marginBottom: '24px' }}>Announcements, updates, and community posts from your ward office.</p>
        <ErrorBox error={error} />

        {posts.length === 0 ? (
          <div className="empty-state-card">
            <p className="screen-title">No ward posts yet</p>
            <p className="body-copy">Your ward office will share local updates here as soon as they become available.</p>
          </div>
        ) : (
          <div className="post-list">
            {posts.map(post => (
              <article key={post.id} className="post-card">
                <div className="feed-card-title">
                  <strong>{post.title}</strong>
                  <small>({post.post_type?.replace('_', ' ')})</small>
                </div>
                <div className="feed-card-meta">
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
                <p className="feed-card-copy">{post.body}</p>
                {post.image && <img src={post.image} alt="Post" />}
                {post.video && (
                  <video src={post.video} controls />
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
