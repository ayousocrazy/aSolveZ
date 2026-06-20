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
    <main className="page-shell" style={{ padding: '48px 0' }}>
      <section className="card" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gap: '22px' }}>
          <div>
            <p className="screen-title">WardConnect</p>
            <p className="body-copy">A civic platform that connects citizens to their local ward office with clarity and care.</p>
          </div>

          {!user ? (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <ActionButton to="/login">Login</ActionButton>
              <ActionButton to="/register">Register</ActionButton>
            </div>
          ) : user.is_ward_account ? (
            <div style={{ display: 'grid', gap: '18px' }}>
              <p className="body-copy">You are signed in as a ward administrator.</p>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <ActionButton to="/ward/issues">View Issues</ActionButton>
                <ActionButton to="/ward/posts">Manage Posts</ActionButton>
                <ActionButton to="/ward/analytics">Analytics</ActionButton>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '18px' }}>
              <p className="body-copy">Welcome back, {user.name}.</p>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <ActionButton to="/issues">Browse Issues</ActionButton>
                <ActionButton to="/issues/new">Submit an Issue</ActionButton>
                <ActionButton to="/ward-posts">Ward Feed</ActionButton>
                <ActionButton to="/ranking">Rankings</ActionButton>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
