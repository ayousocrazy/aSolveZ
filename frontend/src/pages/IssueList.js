import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIssues } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const CATEGORIES = ['road','water','electricity','corruption','health','education','garbage','safety','other'];
const STATUSES = ['pending','acknowledged','completed'];

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
    // If citizen, filter to their ward
    if (user?.ward) params.ward = user.ward;

    getIssues(params)
      .then(d => { setIssues(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [filters, user]);

  const setFilter = (field) => (e) => setFilters(f => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Issues</h2>
        {user && !user.is_ward_account && (
          <Link to="/issues/new"><button>+ Submit Issue</button></Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filters.category} onChange={setFilter('category')}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={setFilter('status')}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.sort} onChange={setFilter('sort')}>
          <option value="new">Newest</option>
          <option value="top">Top Voted</option>
        </select>
      </div>

      {loading && <Spinner />}
      <ErrorBox error={error} />

      {!loading && issues.length === 0 && <p>No issues found.</p>}

      {issues.map(issue => (
        <div key={issue.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ textTransform: 'capitalize' }}>{issue.category}</strong>
              {' — '}
              <span style={{ textTransform: 'capitalize', fontSize: '0.85em' }}>{issue.status}</span>
              <p style={{ margin: '4px 0' }}>{issue.description?.slice(0, 120)}{issue.description?.length > 120 ? '…' : ''}</p>
              <small style={{ color: '#555' }}>
                Ward {issue.ward_number || ''} · {new Date(issue.created_at).toLocaleDateString()}
                {' · '}{issue.vote_score ?? 0} votes · {issue.comment_count ?? 0} comments
              </small>
            </div>
            <Link to={`/issues/${issue.id}`} style={{ whiteSpace: 'nowrap', marginLeft: '12px' }}>View</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
