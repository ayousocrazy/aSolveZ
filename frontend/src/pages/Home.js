import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = {
  login: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  ),
  issues: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  submit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20l9-16H3l9 16z" />
      <path d="M12 11v-2" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="11" width="18" height="4" rx="1" />
      <rect x="3" y="18" width="11" height="3" rx="1" />
    </svg>
  ),
  rankings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4" />
    </svg>
  ),
  posts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </svg>
  ),
};

function Icon({ name }) {
  return <span className="wc-icon" aria-hidden="true">{icons[name]}</span>;
}

function CTAButton({ to, children, icon, variant = 'primary' }) {
  return (
    <Link to={to} className={`button-primary wc-cta wc-cta--${variant}`}>
      <Icon name={icon} />
      <span>{children}</span>
    </Link>
  );
}

function ActionCard({ to, icon, title, description, featured }) {
  return (
    <Link to={to} className={`wc-card${featured ? ' wc-card--featured' : ''}`}>
      <span className="wc-card-icon"><Icon name={icon} /></span>
      <span className="wc-card-title">{title}</span>
      <span className="wc-card-desc">{description}</span>
    </Link>
  );
}

const steps = [
  { n: '01', title: 'Report', text: 'File an issue with your ward in minutes — photos included.' },
  { n: '02', title: 'Respond', text: 'Your ward office reviews it and responds in the open.' },
  { n: '03', title: 'Track', text: 'Follow the status until the issue is actually resolved.' },
];

const values = ['Public by default', 'Ward-verified responses', 'No office visits needed'];

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="page-shell page-pad wc-page">
      <section className="hero-card wc-hero" style={{ maxWidth: '880px', margin: '0 auto' }}>
        <svg className="wc-ridge" viewBox="0 0 880 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,120 L0,80 L90,30 L160,70 L230,15 L310,65 L400,10 L480,60 L560,20 L650,72 L740,35 L820,68 L880,40 L880,120 Z" />
        </svg>

        <div className="wc-flag-rule" aria-hidden="true" />
        {!user ? (
          <>
            <div className="hero-actions wc-actions-row">
              <CTAButton to="/login" icon="login" variant="primary">Login</CTAButton>
              <CTAButton to="/register" icon="register" variant="outline">Register</CTAButton>
            </div>

            <div className="wc-steps">
              {steps.map((s) => (
                <div className="wc-step" key={s.n}>
                  <span className="wc-step-n">{s.n}</span>
                  <p className="wc-step-title">{s.title}</p>
                  <p className="wc-step-text">{s.text}</p>
                </div>
              ))}
            </div>

            <ul className="wc-values">
              {values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </>
        ) : user.is_ward_account ? (
          <div className="wc-actions-row">
            <div className="wc-signed-in">
              <span className="wc-badge wc-badge--admin">Ward Administrator</span>
              <p className="body-copy">Signed in as {user.name}.</p>
            </div>
            <div className="actions-grid wc-grid">
              <ActionCard to="/ward/issues" icon="issues" title="View Issues" description="Open reports waiting on your ward." />
              <ActionCard to="/ward/posts" icon="posts" title="Manage Posts" description="Publish updates citizens will see." />
              <ActionCard to="/ward/analytics" icon="analytics" title="Analytics" description="Response times and resolution rates." />
            </div>
          </div>
        ) : (
          <div className="wc-actions-row">
            <div className="wc-signed-in">
              <p className="body-copy">Namaste, {user.name}.</p>
            </div>
            <div className="actions-grid wc-grid">
              <ActionCard to="/issues/new" icon="submit" title="Submit an Issue" description="Tell your ward office what needs attention." featured />
              <ActionCard to="/issues" icon="issues" title="Browse Issues" description="See what's been reported nearby." />
              <ActionCard to="/ward-posts" icon="feed" title="Ward Feed" description="Official updates from your ward." />
              <ActionCard to="/ranking" icon="rankings" title="Rankings" description="See how wards compare on response." />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}