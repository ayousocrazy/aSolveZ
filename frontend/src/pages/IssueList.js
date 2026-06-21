import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIssues } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const CATEGORIES = ['road','water','electricity','corruption','health','education','garbage','safety','other'];
const STATUSES   = ['pending','acknowledged','completed'];

function prettyKey(value) {
  return (value || '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FLAIR_COLORS = {
  road:        { bg: '#fff3e0', color: '#e65100' },
  water:       { bg: '#e3f2fd', color: '#0d47a1' },
  electricity: { bg: '#fffde7', color: '#f57f17' },
  corruption:  { bg: '#fce4ec', color: '#880e4f' },
  health:      { bg: '#f3e5f5', color: '#6a1b9a' },
  education:   { bg: '#e8eaf6', color: '#283593' },
  garbage:     { bg: '#e8f5e9', color: '#1b5e20' },
  safety:      { bg: '#fbe9e7', color: '#bf360c' },
  other:       { bg: '#eceff1', color: '#37474f' },
};

const STATUS_STYLES = {
  pending:      { bg: '#fff3e0', color: '#e65100' },
  acknowledged: { bg: '#e3f2fd', color: '#0d47a1' },
  completed:    { bg: '#e8f5e9', color: '#1b5e20' },
};

/* ─── Styles ─────────────────────────────────────────────── */

const styles = {
  shell: {
    background: '#dae0e6',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px 12px',
  },
  feed: {
    maxWidth: '740px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  feedHeader: {
    background: '#fff',
    borderRadius: '4px',
    border: '1px solid #ccc',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  feedTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1c1c1c',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  feedSub: {
    fontSize: '12px',
    color: '#7c7c7c',
    marginTop: '2px',
  },
  submitBtn: {
    background: '#ff4500',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  filtersRow: {
    background: '#fff',
    borderRadius: '4px',
    border: '1px solid #ccc',
    padding: '8px 12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterSelect: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid #ccc',
    background: '#f6f7f8',
    color: '#1c1c1c',
    cursor: 'pointer',
  },
  post: {
    display: 'flex',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    overflow: 'hidden',
    transition: 'border-color 0.1s',
    cursor: 'pointer',
  },
  postHover: {
    borderColor: '#898989',
  },
  voteCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 6px',
    background: '#f8f9fa',
    minWidth: '42px',
  },
  voteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#878a8c',
    fontSize: '18px',
    lineHeight: 1,
    padding: '2px 4px',
    borderRadius: '2px',
    transition: 'color 0.1s',
  },
  voteBtnUpActive:   { color: '#ff4500' },
  voteBtnDownActive: { color: '#7193ff' },
  voteCount: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1c1c1c',
    minWidth: '20px',
    textAlign: 'center',
  },
  postBody: {
    flex: 1,
    padding: '10px 12px',
    minWidth: 0,
  },
  postMetaTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#878a8c',
  },
  wardLabel: {
    fontWeight: 700,
    color: '#1c1c1c',
  },
  dot: { color: '#ccc' },
  flair: {
    display: 'inline-block',
    fontSize: '11px',
    padding: '2px 10px',
    borderRadius: '20px',
    marginRight: '6px',
    fontWeight: 700,
    verticalAlign: 'middle',
  },
  statusChip: {
    display: 'inline-block',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '20px',
    fontWeight: 700,
    marginLeft: '4px',
    verticalAlign: 'middle',
  },
  postDescription: {
    fontSize: '14px',
    color: '#1c1c1c',
    lineHeight: 1.6,
    margin: '8px 0 10px',
  },
  moreOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  videoPlayIcon: {
    position: 'absolute',
    width: '36px',
    height: '36px',
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  postFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexWrap: 'wrap',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#878a8c',
    padding: '6px 8px',
    borderRadius: '2px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
    textDecoration: 'none',
  },
  wardBadge: {
    fontSize: '11px',
    color: '#878a8c',
    padding: '4px 8px',
    border: '1px solid #edeff1',
    borderRadius: '20px',
    marginLeft: 'auto',
  },
  emptyCard: {
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '60px 40px',
    textAlign: 'center',
    color: '#7c7c7c',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: '16px',
    color: '#1c1c1c',
    marginBottom: '6px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#7c7c7c',
    marginBottom: '16px',
  },
};

/* ─── Media grid layout configs ─────────────────────────── */

const MEDIA_GRID_BASE = {
  display: 'grid',
  gap: '2px',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '10px',
};

const MEDIA_GRID_CONFIG = {
  1: {
    grid: { ...MEDIA_GRID_BASE, gridTemplateColumns: '1fr' },
    cell: { height: '260px' },
    firstCell: null,
  },
  2: {
    grid: { ...MEDIA_GRID_BASE, gridTemplateColumns: '1fr 1fr' },
    cell: { height: '200px' },
    firstCell: null,
  },
  3: {
    grid: { ...MEDIA_GRID_BASE, gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' },
    cell: { height: '130px' },
    firstCell: { gridRow: 'span 2', height: '264px' },
  },
  4: {
    grid: { ...MEDIA_GRID_BASE, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
    cell: { height: '140px' },
    firstCell: null,
  },
  5: {
    grid: { ...MEDIA_GRID_BASE, gridTemplateColumns: 'repeat(3, 1fr)' },
    cell: { height: '120px' },
    firstCell: null,
  },
};

/* ─── MediaGrid ──────────────────────────────────────────── */

function MediaGrid({ image, video }) {
  // Build a flat list of media items from the single image / video fields.
  // In future you can extend this to accept arrays.
  const items = [];
  if (image) items.push({ type: 'image', src: image });
  if (video) items.push({ type: 'video', src: video });

  if (items.length === 0) return null;

  const total        = items.length;
  const configKey    = Math.min(total, 5);
  const cfg          = MEDIA_GRID_CONFIG[configKey];
  const displayItems = items.slice(0, 5);
  const extra        = total > 5 ? total - 5 : 0;

  const cellBase = {
    position: 'relative',
    background: '#edeff1',
    overflow: 'hidden',
  };

  const mediaFill = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  return (
    <div style={cfg.grid} onClick={e => e.stopPropagation()}>
      {displayItems.map((item, i) => {
        const isFirst = i === 0;
        const isLast  = i === displayItems.length - 1;
        const sizeStyle = (isFirst && cfg.firstCell) ? cfg.firstCell : cfg.cell;

        return (
          <div key={i} style={{ ...cellBase, ...sizeStyle }}>
            {item.type === 'image' ? (
              <img src={item.src} alt={`Issue media ${i + 1}`} style={mediaFill} />
            ) : (
              <>
                <div style={{
                  width: '100%', height: '100%',
                  background: '#1c1c1c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Poster-only — no autoplay */}
                  <video src={item.src} style={mediaFill} muted preload="metadata" />
                </div>
                <div style={styles.videoPlayIcon}>▶</div>
              </>
            )}

            {/* "+N more" overlay on the last visible cell when there are hidden items */}
            {isLast && extra > 0 && (
              <div style={styles.moreOverlay}>+{extra} more</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── VoteButtons ────────────────────────────────────────── */

function VoteButtons({ initialScore, userVote }) {
  const [score, setScore] = useState(initialScore || 0);
  const [voted, setVoted] = useState(
    userVote === 1 ? 'up' : userVote === -1 ? 'down' : null
  );

  const handleVote = (dir) => {
    if (voted === dir) {
      setScore(s => dir === 'up' ? s - 1 : s + 1);
      setVoted(null);
    } else {
      const delta = dir === 'up' ? 1 : -1;
      const undo  = voted ? (voted === 'up' ? -1 : 1) : 0;
      setScore(s => s + delta + undo);
      setVoted(dir);
    }
  };

  return (
    <div style={styles.voteCol}>
      <button
        style={{ ...styles.voteBtn, ...(voted === 'up' ? styles.voteBtnUpActive : {}) }}
        onClick={(e) => { e.stopPropagation(); handleVote('up'); }}
        aria-label="Upvote"
      >▲</button>
      <span style={{
        ...styles.voteCount,
        ...(voted === 'up'   ? { color: '#ff4500' } :
            voted === 'down' ? { color: '#7193ff' } : {}),
      }}>
        {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
      </span>
      <button
        style={{ ...styles.voteBtn, ...(voted === 'down' ? styles.voteBtnDownActive : {}) }}
        onClick={(e) => { e.stopPropagation(); handleVote('down'); }}
        aria-label="Downvote"
      >▼</button>
    </div>
  );
}

/* ─── IssueCard ──────────────────────────────────────────── */

function IssueCard({ issue }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const flairStyle  = FLAIR_COLORS[issue.category] || FLAIR_COLORS.other;
  const statusStyle = STATUS_STYLES[issue.status]   || { bg: '#eceff1', color: '#37474f' };
  const timeAgo     = getTimeAgo(issue.created_at);

  return (
    <article
      style={{ ...styles.post, ...(hovered ? styles.postHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/issues/${issue.id}`)}
      role="button"
      aria-label={`View issue in Ward ${issue.ward_number}`}
    >
      <VoteButtons
        initialScore={issue.vote_score ?? 0}
        userVote={issue.user_vote ?? null}
      />

      <div style={styles.postBody}>
        {/* Meta top */}
        <div style={styles.postMetaTop}>
          <span style={styles.wardLabel}>Ward {issue.ward_number}</span>
          <span style={styles.dot}>•</span>
          <span>Posted by u/{issue.author_name || 'anonymous'}</span>
          <span style={styles.dot}>·</span>
          <span>{timeAgo}</span>
          <span style={{ ...styles.statusChip, background: statusStyle.bg, color: statusStyle.color }}>
            {prettyKey(issue.status)}
          </span>
        </div>

        {/* Category flair */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ ...styles.flair, background: flairStyle.bg, color: flairStyle.color }}>
            {prettyKey(issue.category)}
          </span>
        </div>

        {/* Full description */}
        <p style={styles.postDescription}>{issue.description}</p>

        {/* Media grid */}
        <MediaGrid image={issue.image} video={issue.video} />

        {/* Footer — comments only, share/save removed */}
        <div style={styles.postFooter}>
          <Link
            to={`/issues/${issue.id}`}
            style={styles.footerBtn}
            onClick={e => e.stopPropagation()}
          >
            💬 {issue.comment_count ?? 0} Comments
          </Link>
          <span style={styles.wardBadge}>Ward {issue.ward_number}</span>
        </div>
      </div>
    </article>
  );
}

/* ─── Empty state ────────────────────────────────────────── */

function EmptyState({ hasFilters, user }) {
  return (
    <div style={styles.emptyCard}>
      <div style={styles.emptyIcon}>📭</div>
      {hasFilters ? (
        <>
          <p style={styles.emptyTitle}>No issues match your filters</p>
          <p style={styles.emptyText}>Try adjusting the category or status filter.</p>
        </>
      ) : (
        <>
          <p style={styles.emptyTitle}>No complaints filed yet</p>
          <p style={styles.emptyText}>
            Your ward has no reported issues. Be the first to report one.
          </p>
          {user && !user.is_ward_account && (
            <Link to="/issues/new" style={styles.submitBtn}>+ Submit Issue</Link>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function getTimeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days} day${days  > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
}

/* ─── Main Component ─────────────────────────────────────── */

export default function IssueList() {
  const { user } = useAuth();
  const [issues,  setIssues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sort: 'new' });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.status)   params.status   = filters.status;
    if (filters.sort)     params.sort     = filters.sort;
    // Ward scoping is enforced by the backend — no need to send ward param.

    getIssues(params)
      .then(d => { setIssues(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [filters, user]);

  const setFilter = (field) => (e) =>
    setFilters(f => ({ ...f, [field]: e.target.value }));

  const hasFilters = !!(filters.category || filters.status);
  const wardLabel  = user?.ward_display?.number
    ? `Ward ${user.ward_display.number}`
    : 'All Wards';

  return (
    <main style={styles.shell}>
      <div style={styles.feed}>

        {/* Feed header */}
        <div style={styles.feedHeader}>
          <div>
            <h1 style={styles.feedTitle}>🗺 r/WardIssues</h1>
            <p style={styles.feedSub}>Community issues · {wardLabel}</p>
          </div>
          {user && !user.is_ward_account && (
            <Link to="/issues/new" style={styles.submitBtn}>+ Submit Issue</Link>
          )}
        </div>

        {/* Filters */}
        <div style={styles.filtersRow}>
          <label style={{ fontSize: '12px', color: '#7c7c7c' }}>Filter:</label>
          <select style={styles.filterSelect} value={filters.category} onChange={setFilter('category')}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{prettyKey(c)}</option>)}
          </select>
          <select style={styles.filterSelect} value={filters.status} onChange={setFilter('status')}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{prettyKey(s)}</option>)}
          </select>
          <select style={styles.filterSelect} value={filters.sort} onChange={setFilter('sort')}>
            <option value="new">🆕 New</option>
            <option value="top">⬆ Top Voted</option>
          </select>
        </div>

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error */}
        <ErrorBox error={error} />

        {/* Issue cards */}
        {!loading && !error && issues.map(issue => (
          <IssueCard key={issue.id} issue={issue} />
        ))}

        {/* Empty state */}
        {!loading && !error && issues.length === 0 && (
          <EmptyState hasFilters={hasFilters} user={user} />
        )}

      </div>
    </main>
  );
}