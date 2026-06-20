import React, { useState, useEffect } from 'react';
import { getWardAnalytics } from '../api';
import { Spinner, ErrorBox } from '../components/Common';

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function WardAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getWardAnalytics()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <main className="page-shell page-pad">
      <div className="card" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div className="card-header" style={{ display: 'grid', gap: '16px', alignItems: 'center', gridTemplateColumns: 'auto 1fr' }}>
          <div className="seal" style={{ width: '72px', height: '72px' }}>
            <span className="seal-icon">A</span>
          </div>
          <div>
            <p className="screen-title">Ward analytics</p>
            <p className="body-copy">A clear view of issue trends for your ward office.</p>
          </div>
        </div>

        <ErrorBox error={error} />

        {data ? (
          <div className="analytics-grid" style={{ marginTop: '24px' }}>
            <div className="analytics-panel">
              <p className="section-heading">Ward summary</p>
              <div className="stat-card">
                <p className="body-copy" style={{ marginBottom: '10px' }}>Municipality</p>
                <p className="screen-title" style={{ fontSize: '24px', margin: 0 }}>{data.municipality}</p>
              </div>
              <div className="stat-card">
                <p className="body-copy" style={{ marginBottom: '10px' }}>Ward number</p>
                <p className="screen-title" style={{ fontSize: '24px', margin: 0 }}>Ward {data.ward_number}</p>
              </div>
            </div>

            <div className="analytics-panel">
              <p className="section-heading">Key figures</p>
              <div className="stats-list">
                <StatRow label="Total issues" value={data.total_issues} />
                <StatRow label="Pending" value={data.pending} />
                <StatRow label="Acknowledged" value={data.acknowledged} />
                <StatRow label="Completed" value={data.completed} />
                <StatRow label="Completion rate" value={data.total_issues > 0 ? `${Math.round((data.completed / data.total_issues) * 100)}%` : 'N/A'} />
                <StatRow label="False resolution reports" value={data.false_resolution_reports} />
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state-card" style={{ marginTop: '24px' }}>
            <div className="seal" style={{ width: '84px', height: '84px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
              <span className="seal-icon">✓</span>
            </div>
            <p className="screen-title" style={{ marginTop: '20px' }}>Analytics not available yet</p>
            <p className="body-copy">Your ward analytics page will show once your office has issued its first complaint summary.</p>
          </div>
        )}
      </div>
    </main>
  );
}
