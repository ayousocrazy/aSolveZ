import React, { useState, useEffect, useMemo } from 'react';
import { getWardAnalytics, getWardIssues } from '../api';
import { Spinner, ErrorBox } from '../components/Common';
import { computeWardStats, formatDuration, CATEGORY_LABELS } from '../utils/wardAnalyticsUtils';
import { downloadWardAnalyticsPdf } from '../utils/wardAnalyticsPdf';

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sublabel, accent }) {
  return (
    <div className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={accent ? { color: accent } : undefined}>{value}</p>
      {sublabel ? <p className="kpi-sublabel">{sublabel}</p> : null}
    </div>
  );
}

function CompletionRing({ percentage }) {
  const angle = Math.max(0, Math.min(100, percentage)) * 3.6;
  return (
    <div
      className="completion-ring"
      style={{
        background: `conic-gradient(var(--wa-accent) ${angle}deg, var(--wa-track) ${angle}deg)`,
      }}
    >
      <div className="completion-ring-hole">
        <span className="completion-ring-value">{percentage}%</span>
        <span className="completion-ring-caption">resolved</span>
      </div>
    </div>
  );
}

function CategoryBar({ row }) {
  return (
    <div className="category-row">
      <div className="category-row-label">
        <span className="category-dot" style={{ backgroundColor: row.color }} />
        <span>{row.label}</span>
      </div>
      <div className="category-row-track">
        <div
          className="category-row-fill"
          style={{ width: `${Math.max(row.percentage, row.count ? 2 : 0)}%`, backgroundColor: row.color }}
        />
      </div>
      <div className="category-row-meta">
        {row.count} <span className="category-row-pct">({row.percentage}%)</span>
      </div>
    </div>
  );
}

function TrendChart({ months }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.submitted, m.completed)));
  return (
    <div className="trend-chart">
      {months.map((m) => (
        <div className="trend-col" key={m.label}>
          <div className="trend-bars">
            <div
              className="trend-bar trend-bar-submitted"
              style={{ height: `${(m.submitted / max) * 100}%` }}
              title={`Submitted: ${m.submitted}`}
            />
            <div
              className="trend-bar trend-bar-completed"
              style={{ height: `${(m.completed / max) * 100}%` }}
              title={`Completed: ${m.completed}`}
            />
          </div>
          <p className="trend-label">{m.label}</p>
        </div>
      ))}
      <div className="trend-legend">
        <span><i className="legend-swatch legend-swatch-submitted" /> Submitted</span>
        <span><i className="legend-swatch legend-swatch-completed" /> Completed</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WardAnalytics() {
  const [summary, setSummary] = useState(null);
  const [issues, setIssues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([getWardAnalytics(), getWardIssues()])
      .then(([summaryData, issuesData]) => {
        const issueList = Array.isArray(issuesData) ? issuesData : (issuesData?.results || []);
        setSummary(summaryData);
        setIssues(issueList);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => (issues ? computeWardStats(issues) : null), [issues]);

  const handleDownload = () => {
    if (!summary || !stats) return;
    setDownloading(true);
    try {
      downloadWardAnalyticsPdf({ ward: summary, stats });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Spinner />;

  const hasData = Boolean(summary && stats && stats.total > 0);

  return (
    <main className="page-shell page-pad ward-analytics-page">
      <style>{REPORT_STYLES}</style>

      <div className="card ward-report-card">
        <div className="card-header ward-report-header">
          <div className="seal" style={{ width: '72px', height: '72px' }}>
            <span className="seal-icon">A</span>
          </div>
          <div className="ward-report-heading">
            <p className="screen-title">Ward analytics</p>
            <p className="body-copy">
              {summary
                ? `Ward ${summary.ward_number} — ${summary.municipality}`
                : 'A clear view of issue trends for your ward office.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-download-pdf"
            onClick={handleDownload}
            disabled={!hasData || downloading}
            title={hasData ? 'Download a PDF report of this analytics page' : 'No data to export yet'}
          >
            {downloading ? 'Preparing PDF…' : '⬇ Download PDF'}
          </button>
        </div>

        <ErrorBox error={error} />

        {hasData ? (
          <div className="ward-report-body">
            {/* KPI row */}
            <div className="kpi-grid">
              <KpiCard label="Total issues" value={stats.total} />
              <KpiCard label="Pending" value={stats.pending} accent="var(--wa-pending)" />
              <KpiCard label="Acknowledged" value={stats.acknowledged} accent="var(--wa-acknowledged)" />
              <KpiCard label="Completed" value={stats.completed} accent="var(--wa-completed)" />
            </div>

            {/* Completion + response time */}
            <div className="analytics-panel two-col-panel">
              <div className="completion-block">
                <p className="section-heading">Completion rate</p>
                <CompletionRing percentage={stats.completionRate} />
                {summary.false_resolution_reports !== undefined && (
                  <p className="body-copy small-note">
                    {summary.false_resolution_reports} open false-resolution{' '}
                    {summary.false_resolution_reports === 1 ? 'report' : 'reports'} under review
                  </p>
                )}
              </div>

              <div className="response-time-block">
                <p className="section-heading">Response &amp; resolution time</p>
                <div className="stats-list">
                  <div className="stat-row">
                    <span>Average response time</span>
                    <strong>{formatDuration(stats.avgResponseHours)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Average resolution time</span>
                    <strong>{formatDuration(stats.avgResolutionHours)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Fastest resolution</span>
                    <strong>{formatDuration(stats.fastestResolutionHours)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Slowest resolution</span>
                    <strong>{formatDuration(stats.slowestResolutionHours)}</strong>
                  </div>
                </div>
                <p className="body-copy small-note">
                  Estimated from issue update timestamps — add status-change timestamps on the
                  backend later for exact figures.
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="analytics-panel">
              <p className="section-heading">Issues by category</p>
              <div className="category-breakdown">
                {stats.categoryBreakdown.map((row) => (
                  <CategoryBar row={row} key={row.category} />
                ))}
              </div>
            </div>

            {/* Monthly trend */}
            <div className="analytics-panel">
              <p className="section-heading">Monthly trend</p>
              <TrendChart months={stats.monthlyTrend} />
            </div>
          </div>
        ) : (
          <div className="empty-state-card" style={{ marginTop: '24px' }}>
            <div
              className="seal"
              style={{
                width: '84px',
                height: '84px',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span className="seal-icon">✓</span>
            </div>
            <p className="screen-title" style={{ marginTop: '20px' }}>Analytics not available yet</p>
            <p className="body-copy">
              Your ward analytics page will show once your office has issued its first complaint
              summary.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Scoped styles. Self-contained so this page works without touching the
// app's global stylesheet — move into it later if you'd rather keep all
// CSS in one place. Falls back gracefully if the app's own --color-* tokens
// aren't defined.
// ---------------------------------------------------------------------------

const REPORT_STYLES = `
.ward-analytics-page {
  --wa-primary: var(--color-primary, #15396b);
  --wa-accent: var(--color-accent, #c8102e);
  --wa-pending: #d9a441;
  --wa-acknowledged: #3a8fb7;
  --wa-completed: #4f9d69;
  --wa-track: var(--color-bg-secondary, #eef1f5);
  --wa-border: var(--color-border, #e2e5ea);
  --wa-text-muted: var(--color-text-muted, #6b7280);
}

.ward-report-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
}

.btn-download-pdf {
  white-space: nowrap;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--wa-primary);
  background: var(--wa-primary);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-download-pdf:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-download-pdf:not(:disabled):hover {
  opacity: 0.9;
}

.ward-report-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.kpi-card {
  border: 1px solid var(--wa-border);
  border-radius: 10px;
  padding: 16px;
  background: var(--color-bg-secondary, #fafbfc);
}
.kpi-label {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wa-text-muted);
}
.kpi-value {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--wa-primary);
}
.kpi-sublabel {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--wa-text-muted);
}

.two-col-panel {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
}
.completion-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.completion-ring {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
}
.completion-ring-hole {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: var(--color-bg-primary, #fff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.completion-ring-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--wa-primary);
}
.completion-ring-caption {
  font-size: 11px;
  color: var(--wa-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.small-note {
  font-size: 12px;
  color: var(--wa-text-muted);
  margin-top: 10px;
}

.category-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.category-row {
  display: grid;
  grid-template-columns: 130px 1fr 90px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.category-row-label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.category-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.category-row-track {
  height: 8px;
  border-radius: 4px;
  background: var(--wa-track);
  overflow: hidden;
}
.category-row-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.2s ease;
}
.category-row-meta {
  text-align: right;
  color: var(--wa-text-muted);
}
.category-row-pct {
  font-size: 11px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  height: 160px;
  margin-top: 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--wa-border);
  position: relative;
}
.trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 130px;
  width: 100%;
  justify-content: center;
}
.trend-bar {
  width: 14px;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
}
.trend-bar-submitted { background: var(--wa-primary); opacity: 0.85; }
.trend-bar-completed { background: var(--wa-completed); }
.trend-label {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--wa-text-muted);
}
.trend-legend {
  position: absolute;
  top: -2px;
  right: 0;
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--wa-text-muted);
}
.legend-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
}
.legend-swatch-submitted { background: var(--wa-primary); opacity: 0.85; }
.legend-swatch-completed { background: var(--wa-completed); }

@media (max-width: 720px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .two-col-panel { grid-template-columns: 1fr; }
  .ward-report-header { grid-template-columns: auto 1fr; }
  .btn-download-pdf { grid-column: 1 / -1; }
}
`;