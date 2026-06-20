import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIssues } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const CATEGORIES = ['road','water','electricity','corruption','health','education','garbage','safety','other'];
const STATUSES = ['pending','acknowledged','completed'];

function prettyKey(value) {
  return value.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IssueList() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sort: 'new' });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.sort) params.sort = filters.sort;
    if (user?.ward) params.ward = user.ward;

    getIssues(params)
      .then(d => { setIssues(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [filters, user]);

  const setFilter = (field) => (e) => setFilters(f => ({ ...f, [field]: e.target.value }));

  return (
    <main className="page-shell page-pad">
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-heading">Issues</h1>
            <p className="body-copy">Browse current community issues and follow progress on the ones that matter most.</p>
          </div>
          {user && !user.is_ward_account && (
            <Link to="/issues/new" className="button-primary">+ Submit Issue</Link>
          )}
        </div>

        <div className="filters-row" style={{ marginBottom: '22px' }}>
          <label className="label">
            Category
            <select className="select-field" value={filters.category} onChange={setFilter('category')}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{prettyKey(c)}</option>)}
            </select>
          </label>
          <label className="label">
            Status
            <select className="select-field" value={filters.status} onChange={setFilter('status')}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{prettyKey(s)}</option>)}
            </select>
          </label>
          <label className="label">
            Sort by
            <select className="select-field" value={filters.sort} onChange={setFilter('sort')}>
              <option value="new">Newest</option>
              <option value="top">Top Voted</option>
            </select>
          </label>
        </div>

        {loading && <Spinner />}
        <ErrorBox error={error} />

        {!loading && issues.length === 0 && (
          <div className="empty-state-card">
            <p className="screen-title">No issues found</p>
            <p className="body-copy">Try changing the filters or submit a new issue for your ward.</p>
          </div>
        )}

        <div className="issue-list">
          {issues.map(issue => (
            <article key={issue.id} className="issue-card">
              <div className="issue-card-main">
                <div className="issue-card-title">
                  <span>{prettyKey(issue.category)}</span>
                  <span className={`status-chip status-${issue.status || 'other'}`}>{prettyKey(issue.status || 'unknown')}</span>
                </div>
                <p className="issue-card-copy">{issue.description?.slice(0, 120)}{issue.description?.length > 120 ? '…' : ''}</p>
                <div className="card-meta">
                  <small>Ward {issue.ward_number || ''}</small>
                  <small>{new Date(issue.created_at).toLocaleDateString()}</small>
                  <small>{issue.vote_score ?? 0} votes</small>
                  <small>{issue.comment_count ?? 0} comments</small>
                </div>
              </div>
              <div className="issue-card-actions">
                <Link to={`/issues/${issue.id}`} className="button-secondary">View</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
