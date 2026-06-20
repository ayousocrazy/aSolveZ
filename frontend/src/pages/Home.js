import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ActionButton({ to, children }) {
  return (
    <Link to={to} className="button-primary">
      {children}
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="page-shell page-pad">
      <section className="hero-card" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div>
          <p className="screen-title">WardConnect</p>
          <p className="page-subtitle">A civic platform bringing citizens and ward offices closer with clarity, trust, and a distinctly Nepalese sense of service.</p>
        </div>

        {!user ? (
          <div className="hero-actions" style={{ marginTop: '28px' }}>
            <ActionButton to="/login">Login</ActionButton>
            <ActionButton to="/register">Register</ActionButton>
          </div>
        ) : user.is_ward_account ? (
          <div className="hero-actions" style={{ marginTop: '28px' }}>
            <div>
              <p className="body-copy">Signed in as a ward administrator.</p>
            </div>
            <div className="actions-grid">
              <ActionButton to="/ward/issues">View Issues</ActionButton>
              <ActionButton to="/ward/posts">Manage Posts</ActionButton>
              <ActionButton to="/ward/analytics">Analytics</ActionButton>
            </div>
          </div>
        ) : (
          <div className="hero-actions" style={{ marginTop: '28px' }}>
            <div>
              <p className="body-copy">Welcome back, {user.name}.</p>
            </div>
            <div className="actions-grid">
              <ActionButton to="/issues">Browse Issues</ActionButton>
              <ActionButton to="/issues/new">Submit an Issue</ActionButton>
              <ActionButton to="/ward-posts">Ward Feed</ActionButton>
              <ActionButton to="/ranking">Rankings</ActionButton>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
