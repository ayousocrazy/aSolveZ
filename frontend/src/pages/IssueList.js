import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIssues } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

const CATEGORIES = ['road','water','electricity','corruption','health','education','garbage','safety','other'];
const STATUSES = ['pending','acknowledged','completed'];

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

/* ─── SVG Illustrations ─────────────────────────────────── */

function RoadIllustration() {
  return (
    <svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" style={styles.postImg}>
      <rect width="640" height="200" fill="#555"/>
      <rect x="0" y="140" width="640" height="60" fill="#444"/>
      <rect x="0" y="60" width="640" height="80" fill="#606060"/>
      <ellipse cx="280" cy="145" rx="60" ry="28" fill="#333"/>
      <ellipse cx="280" cy="145" rx="50" ry="22" fill="#222"/>
      <line x1="310" y1="90" x2="295" y2="128" stroke="#ff4500" strokeWidth="2.5" strokeDasharray="4,3"/>
      <circle cx="310" cy="86" r="14" fill="#ff4500"/>
      <text x="310" y="91" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">!</text>
      <rect x="8" y="155" width="100" height="16" rx="4" fill="rgba(0,0,0,0.55)"/>
      <text x="58" y="167" textAnchor="middle" fill="white" fontSize="11">Sankhamul Rd</text>
      <rect x="400" y="70" width="200" height="50" rx="6" fill="rgba(0,0,0,0.5)"/>
      <text x="500" y="91" textAnchor="middle" fill="#ffd" fontSize="11" fontWeight="500">📍 Ward 4, Kathmandu</text>
      <text x="500" y="108" textAnchor="middle" fill="#aaa" fontSize="10">Reported by 12 residents</text>
    </svg>
  );
}

function WaterIllustration() {
  return (
    <svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" style={styles.postImg}>
      <rect width="640" height="200" fill="#e3f2fd"/>
      <rect x="0" y="120" width="640" height="80" fill="#bbdefb"/>
      <circle cx="80" cy="90" r="50" fill="#90caf9" opacity="0.4"/>
      <rect x="260" y="60" width="120" height="90" rx="8" fill="#1565c0"/>
      <rect x="275" y="75" width="90" height="60" rx="4" fill="#1976d2"/>
      <text x="320" y="113" textAnchor="middle" fill="white" fontSize="28">🚰</text>
      <line x1="380" y1="130" x2="440" y2="130" stroke="#0d47a1" strokeWidth="3" strokeDasharray="8,4"/>
      <circle cx="450" cy="130" r="10" fill="#ef5350"/>
      <text x="450" y="135" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">✕</text>
      <rect x="470" y="115" width="150" height="30" rx="6" fill="rgba(0,0,0,0.1)"/>
      <text x="545" y="135" textAnchor="middle" fill="#0d47a1" fontSize="12" fontWeight="500">11 days without supply</text>
      <text x="320" y="185" textAnchor="middle" fill="#0d47a1" fontSize="11">Balaju, Ward 7 · Last supply: June 9</text>
    </svg>
  );
}

function ElectricityIllustration() {
  return (
    <svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" style={styles.postImg}>
      <rect width="640" height="200" fill="#1a1a2e"/>
      <rect x="0" y="150" width="640" height="50" fill="#111"/>
      <rect x="0" y="130" width="640" height="22" fill="#222"/>
      <line x1="0" y1="152" x2="640" y2="152" stroke="#fff" strokeWidth="1.5" strokeDasharray="40,20" opacity="0.3"/>
      {[60, 200, 340, 480].map(x => (
        <g key={x} opacity="0.25">
          <rect x={x} y="60" width="6" height="80" fill="#888"/>
          <circle cx={x + 3} cy="57" r="14" fill="#555"/>
          <circle cx={x + 3} cy="57" r="8" fill="#333"/>
        </g>
      ))}
      <text x="320" y="115" textAnchor="middle" fill="#666" fontSize="28">🌑</text>
      <rect x="180" y="25" width="280" height="28" rx="6" fill="rgba(255,200,0,0.12)"/>
      <text x="320" y="44" textAnchor="middle" fill="#ffd54f" fontSize="13" fontWeight="500">⚠ No street lighting · Koteshwor Ring Rd</text>
      <text x="320" y="185" textAnchor="middle" fill="#555" fontSize="11">Ward 12 · 3 muggings reported after dark</text>
    </svg>
  );
}

function GarbageIllustration() {
  return (
    <svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" style={styles.postImg}>
      <rect width="640" height="200" fill="#f1f8e9"/>
      <rect x="0" y="140" width="640" height="60" fill="#dcedc8"/>
      <ellipse cx="200" cy="155" rx="130" ry="38" fill="#8d6e63"/>
      <ellipse cx="200" cy="148" rx="110" ry="30" fill="#795548"/>
      <text x="125" y="138" textAnchor="middle" fontSize="20">🗑</text>
      <text x="188" y="133" textAnchor="middle" fontSize="22">🗑</text>
      <text x="253" y="140" textAnchor="middle" fontSize="18">📦</text>
      <circle cx="145" cy="105" r="12" fill="#4caf50" opacity="0.7"/>
      <circle cx="175" cy="98" r="8" fill="#8bc34a" opacity="0.7"/>
      <circle cx="245" cy="95" r="14" fill="#4caf50" opacity="0.4"/>
      <rect x="370" y="50" width="240" height="80" rx="8" fill="rgba(0,0,0,0.07)"/>
      <text x="490" y="75" textAnchor="middle" fill="#33691e" fontSize="12" fontWeight="500">🗓 Last collection: June 11</text>
      <text x="490" y="95" textAnchor="middle" fill="#558b2f" fontSize="11">9 days without pickup</text>
      <text x="490" y="115" textAnchor="middle" fill="#ff6f00" fontSize="11">⚠ Monsoon risk: disease outbreak</text>
      <text x="320" y="185" textAnchor="middle" fill="#558b2f" fontSize="11">Asan Market area · Ward 2</text>
    </svg>
  );
}

const ILLUSTRATIONS = {
  road: RoadIllustration,
  water: WaterIllustration,
  electricity: ElectricityIllustration,
  garbage: GarbageIllustration,
};

/* ─── Dummy posts (shown when API returns nothing or while loading) ─── */

const DUMMY_POSTS = [
  {
    id: 'demo-1',
    category: 'road',
    status: 'acknowledged',
    description: "Massive pothole on Sankhamul-Tinkune road has swallowed two motorbikes this week - city still hasn't responded. The pothole near Sankhamul bridge has been growing for 3 months.",
    ward_number: 4,
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    vote_score: 847,
    comment_count: 234,
    author: 'ramesh_tamang',
  },
  {
    id: 'demo-2',
    category: 'water',
    status: 'pending',
    description: "Drinking water supply cut for 11 days straight in Balaju area - no official notice given to residents. KUKL has not given any explanation. We are forced to buy water at Rs 800 per jar.",
    ward_number: 7,
    created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    vote_score: 512,
    comment_count: 189,
    author: 'sunita_rai',
  },
  {
    id: 'demo-3',
    category: 'electricity',
    status: 'completed',
    description: "Street lights on the entire Koteshwor ring road stretch have been out for 3 weeks - muggings reported. Update: NEA finally fixed the transformer on June 18! Lights restored.",
    ward_number: 12,
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    vote_score: 301,
    comment_count: 97,
    author: 'bikash_giri',
  },
  {
    id: 'demo-4',
    category: 'garbage',
    status: 'pending',
    description: "Garbage pile near Asan market has not been collected in 9 days - health hazard with monsoon approaching. The pile is spilling onto the footpath and the smell is unbearable.",
    ward_number: 2,
    created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    vote_score: 198,
    comment_count: 143,
    author: 'anita_shrestha',
  },
];

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
  voteBtnUpActive: { color: '#ff4500' },
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
  postTitle: {
    fontSize: '18px',
    fontWeight: 500,
    color: '#222',
    marginBottom: '8px',
    lineHeight: 1.4,
  },
  flair: {
    display: 'inline-block',
    fontSize: '11px',
    padding: '2px 10px',
    borderRadius: '20px',
    marginRight: '8px',
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
  postImg: {
    width: '100%',
    maxHeight: '240px',
    borderRadius: '4px',
    marginBottom: '8px',
    display: 'block',
  },
  postPreview: {
    fontSize: '14px',
    color: '#474748',
    lineHeight: 1.6,
    marginBottom: '8px',
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
    padding: '40px',
    textAlign: 'center',
    color: '#7c7c7c',
  },
  viewLink: {
    color: '#0079d3',
    fontWeight: 700,
    fontSize: '12px',
    textDecoration: 'none',
  },
};

/* ─── VoteButton ─────────────────────────────────────────── */

function VoteButtons({ initialScore }) {
  const [score, setScore] = useState(initialScore || 0);
  const [voted, setVoted] = useState(null); // 'up' | 'down' | null

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
      <span style={{ ...styles.voteCount, ...(voted === 'up' ? { color: '#ff4500' } : voted === 'down' ? { color: '#7193ff' } : {}) }}>
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
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState(false);

  const flairStyle = FLAIR_COLORS[issue.category] || FLAIR_COLORS.other;
  const statusStyle = STATUS_STYLES[issue.status] || { bg: '#eceff1', color: '#37474f' };
  const Illustration = ILLUSTRATIONS[issue.category];
  const timeAgo = getTimeAgo(issue.created_at);

  return (
    <article
      style={{ ...styles.post, ...(hovered ? styles.postHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <VoteButtons initialScore={issue.vote_score ?? 0} />

      <div style={styles.postBody}>
        {/* Meta top */}
        <div style={styles.postMetaTop}>
          <span style={styles.wardLabel}>Ward {issue.ward_number}</span>
          <span style={styles.dot}>•</span>
          <span>Posted by u/{issue.author || 'anonymous'}</span>
          <span style={styles.dot}>·</span>
          <span>{timeAgo}</span>
          <span
            style={{ ...styles.statusChip, background: statusStyle.bg, color: statusStyle.color }}
          >{prettyKey(issue.status)}</span>
        </div>

        {/* Title */}
        <div style={styles.postTitle}>
          <span style={{ ...styles.flair, background: flairStyle.bg, color: flairStyle.color }}>
            {prettyKey(issue.category)}
          </span>
          {issue.description?.slice(0, 100)}
          {issue.description?.length > 100 ? '…' : ''}
        </div>

        {/* Illustration */}
        {Illustration && <Illustration />}

        {/* Preview text */}
        <p style={styles.postPreview}>
          {issue.description?.slice(0, 220)}{issue.description?.length > 220 ? '…' : ''}
        </p>

        {/* Footer */}
        <div style={styles.postFooter}>
          <Link to={`/issues/${issue.id}`} style={styles.footerBtn} onClick={e => e.stopPropagation()}>
            💬 {issue.comment_count ?? 0} Comments
          </Link>
          <button style={styles.footerBtn}>🔗 Share</button>
          <button
            style={{ ...styles.footerBtn, color: saved ? '#ff4500' : '#878a8c' }}
            onClick={(e) => { e.stopPropagation(); setSaved(s => !s); }}
          >{saved ? '🔖 Saved' : '🔖 Save'}</button>
          <span style={styles.wardBadge}>Ward {issue.ward_number}</span>
        </div>
      </div>
    </article>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
}

/* ─── Main Component ─────────────────────────────────────── */

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
    if (filters.status)   params.status   = filters.status;
    if (filters.sort)     params.sort     = filters.sort;
    if (user?.ward)       params.ward     = user.ward;

    getIssues(params)
      .then(d => { setIssues(d.results || d); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, [filters, user]);

  const setFilter = (field) => (e) => setFilters(f => ({ ...f, [field]: e.target.value }));

  /* Fall back to dummy posts when API is empty */
  const displayIssues = (!loading && issues.length === 0 && !error) ? DUMMY_POSTS : issues;

  return (
    <main style={styles.shell}>
      <div style={styles.feed}>

        {/* Feed header */}
        <div style={styles.feedHeader}>
          <div>
            <h1 style={styles.feedTitle}>
              🗺 r/WardIssues
            </h1>
            <p style={styles.feedSub}>Community issues · {user?.ward ? `Ward ${user.ward}` : 'All Wards'}</p>
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
            <option value="hot">🔥 Hot</option>
          </select>
        </div>

        {/* Loading / Error */}
        {loading && <Spinner />}
        <ErrorBox error={error} />

        {/* Posts */}
        {displayIssues.map(issue => (
          <IssueCard key={issue.id} issue={issue} />
        ))}

        {/* True empty state (after filtering) */}
        {!loading && issues.length === 0 && (filters.category || filters.status) && (
          <div style={styles.emptyCard}>
            <p style={{ fontWeight: 700, marginBottom: '6px' }}>No issues found</p>
            <p style={{ fontSize: '13px' }}>Try changing the filters or submit a new issue for your ward.</p>
          </div>
        )}
      </div>
    </main>
  );
}