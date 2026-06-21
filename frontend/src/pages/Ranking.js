import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getMunicipalities, getMunicipalityRanking } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

/* ─── Squarified treemap ─────────────────────────────────── */

function squarify(items, x, y, w, h) {
  const total = items.reduce((s, d) => s + d._a, 0);
  if (!items.length || total === 0) return [];
  const results = [];

  function layoutRow(row, rx, ry, rw, rh) {
    const rs = row.reduce((s, d) => s + d._a, 0);
    const rf = rs / total;
    if (rw <= rh) {
      const rH = rh * rf;
      let cx = rx;
      row.forEach(d => {
        const cw = rw * (d._a / rs);
        results.push({ ...d, x: cx, y: ry, w: cw, h: rH });
        cx += cw;
      });
    } else {
      const rW = rw * rf;
      let cy = ry;
      row.forEach(d => {
        const ch = rh * (d._a / rs);
        results.push({ ...d, x: rx, y: cy, w: rW, h: ch });
        cy += ch;
      });
    }
  }

  function worst(row, side) {
    const s  = row.reduce((a, d) => a + d._a, 0);
    const mx = Math.max(...row.map(d => d._a));
    const mn = Math.min(...row.map(d => d._a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  }

  const sorted = [...items].sort((a, b) => b._a - a._a);
  let row = [], rx = x, ry = y, rw = w, rh = h;

  for (const d of sorted) {
    const side = Math.min(rw, rh);
    const next = [...row, d];
    if (!row.length || worst(row, side) >= worst(next, side)) {
      row = next;
    } else {
      layoutRow(row, rx, ry, rw, rh);
      const rs = row.reduce((s, d) => s + d._a, 0);
      const rf = rs / total;
      if (rw <= rh) { ry += rh * rf; rh -= rh * rf; }
      else          { rx += rw * rf; rw -= rw * rf; }
      row = [d];
    }
  }
  if (row.length) layoutRow(row, rx, ry, rw, rh);
  return results;
}

/* ─── Inactive check ─────────────────────────────────────── */

function isInactive(cell) {
  return (cell.total_issues ?? cell.total ?? 0) === 0;
}

/* ─── Color: green (all resolved) → red (all pending) ───── */

function pendingColor(ratio, inactive = false) {
  if (inactive) return 'rgb(160, 160, 160)';
  const t = Math.pow(Math.max(0, Math.min(1, ratio)), 0.5);
  return `rgb(
    ${Math.round(22  + (183 - 22)  * t)},
    ${Math.round(120 + (28  - 120) * t)},
    ${Math.round(36  + (28  - 36)  * t)}
  )`;
}

function pendingBorder(ratio, inactive = false) {
  if (inactive) return 'rgb(190, 190, 190)';
  const t = Math.pow(Math.max(0, Math.min(1, ratio)), 0.5);
  return `rgb(
    ${Math.round(30  + (220 - 30)  * t)},
    ${Math.round(150 + (50  - 150) * t)},
    ${Math.round(55  + (50  - 55)  * t)}
  )`;
}

/* ─── Styles ─────────────────────────────────────────────── */

const S = {
  shell: {
    background: '#f0f2f5',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px 16px',
  },
  inner: { maxWidth: '960px', margin: '0 auto' },
  heading: { fontSize: '22px', fontWeight: 700, color: '#1c1c1c', margin: '0 0 4px' },
  subhead: { fontSize: '13px', color: '#7c7c7c', margin: '0 0 20px' },
  controls: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '16px', flexWrap: 'wrap',
  },
  muniLabel: { fontSize: '13px', color: '#555', fontWeight: 600 },
  muniTag: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    marginBottom: '16px', padding: '6px 14px',
    background: '#fff', border: '1px solid #ddd', borderRadius: '20px',
    fontSize: '13px', color: '#555',
  },
  muniTagName: { fontWeight: 700, color: '#1c1c1c' },
  select: {
    fontSize: '13px', padding: '6px 12px', borderRadius: '6px',
    border: '1px solid #ccc', background: '#fff', color: '#1c1c1c',
    cursor: 'pointer', minWidth: '220px',
  },
  mapWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#111',
  },
  tooltip: {
    position: 'absolute',
    pointerEvents: 'none',
    background: 'rgba(10,10,10,0.92)',
    color: '#fff',
    borderRadius: '7px',
    padding: '10px 14px',
    fontSize: '13px',
    lineHeight: 1.65,
    minWidth: '175px',
    zIndex: 10,
  },
  legendRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginTop: '10px', flexWrap: 'wrap',
  },
  legendLabel: { fontSize: '12px', color: '#666' },
  legendBar: {
    flex: 1, maxWidth: '260px', height: '10px',
    borderRadius: '5px',
    background: 'linear-gradient(to right, #167024, #4a7a1e, #8b6e14, #b74420, #b71c1c)',
  },
  legendTicks: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '10px', color: '#999', marginTop: '3px',
    maxWidth: '260px', flex: 1,
  },
  legendGray: {
    display: 'flex', alignItems: 'center', gap: '6px',
    marginTop: '6px', fontSize: '12px', color: '#666',
  },
  legendGrayBox: {
    width: '14px', height: '14px', borderRadius: '3px',
    background: 'rgb(160,160,160)', flexShrink: 0,
  },
  sizeNote: { fontSize: '11px', color: '#999', marginTop: '6px' },
  emptyCard: {
    background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
    padding: '48px 32px', textAlign: 'center', color: '#888',
  },
  rankTable: {
    marginTop: '20px', background: '#fff',
    border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden',
  },
  rankHead: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 64px 72px 72px 64px 80px',
    padding: '8px 14px', background: '#f5f5f5',
    fontSize: '11px', fontWeight: 700, color: '#888',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1px solid #e0e0e0', gap: '8px',
  },
  rankRow: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 64px 72px 72px 64px 80px',
    padding: '9px 14px', fontSize: '13px', color: '#1c1c1c',
    borderBottom: '1px solid #f0f0f0', alignItems: 'center', gap: '8px',
  },
};

/* ─── SVG Ward cell ──────────────────────────────────────── */

const PAD = 2;

function WardCell({ cell, onEnter, onMove, onLeave, highlighted }) {
  const cw       = Math.max(0, cell.w - PAD * 2);
  const ch       = Math.max(0, cell.h - PAD * 2);
  const inactive = isInactive(cell);
  const ratio = cell.total_issues > 0 ? cell.pending / cell.total_issues : 0;
  const fill     = pendingColor(ratio, inactive);
  const border   = highlighted ? 'rgba(255,255,255,0.9)' : pendingBorder(ratio, inactive);
  const sw       = highlighted ? 2 : 0.8;
  const fs       = Math.min(13, Math.max(9, cw / 7));
  const showTitle = cw > 50 && ch > 28;
  const showSub   = ch > 48 && cw > 60;

  return (
    <g
      transform={`translate(${cell.x + PAD},${cell.y + PAD})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={e => onEnter(cell, e)}
      onMouseMove={e  => onMove(e)}
      onMouseLeave={onLeave}
    >
      <rect width={cw} height={ch} rx={3} fill={fill} stroke={border} strokeWidth={sw} />
      {showTitle && (
        <text
          x={7} y={fs + 6}
          fill="rgba(255,255,255,0.95)"
          fontSize={fs} fontWeight={700}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          Ward {cell.ward_number}
        </text>
      )}
      {showSub && (
        <text
          x={7} y={fs * 2 + 10}
          fill="rgba(255,255,255,0.6)"
          fontSize={Math.max(9, fs - 1)}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {inactive
            ? 'No activity'
            : `${Math.round(ratio * 100)}% pending · ${cell.total} issues`}
        </text>
      )}
    </g>
  );
}

/* ─── Treemap component ───────────────────────────────────── */

function Treemap({ wards }) {
  const wrapRef  = useRef(null);
  const [dims,   setDims]   = useState({ w: 880, h: 480 });
  const [tip,    setTip]    = useState(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setDims({ w, h: Math.max(300, Math.round(w * 0.52)) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => {
    if (!wards.length) return [];
    return squarify(
      wards.map(w => ({ ...w, _a: Math.max(w.total_issues, 1) })),
      0, 0, dims.w, dims.h
    );
  }, [wards, dims]);

  const handleEnter = useCallback((cell, e) => {
    setActive(cell.ward_id);
    setTip(cell);
    const rect = wrapRef.current.getBoundingClientRect();
    setTipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
  }, []);

  const handleMove = useCallback(e => {
    const rect = wrapRef.current.getBoundingClientRect();
    setTipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
  }, []);

  const handleLeave = useCallback(() => {
    setActive(null);
    setTip(null);
  }, []);

  return (
    <div ref={wrapRef} style={S.mapWrap}>
      <svg width={dims.w} height={dims.h} style={{ display: 'block' }}>
        {cells.map(c => (
          <WardCell
            key={c.ward_id}
            cell={c}
            onEnter={handleEnter}
            onMove={handleMove}
            onLeave={handleLeave}
            highlighted={active === c.ward_id}
          />
        ))}
      </svg>

      {tip && (
        <div style={{ ...S.tooltip, left: tipPos.x, top: tipPos.y }}>
          <div style={{ fontWeight: 700, marginBottom: '5px', fontSize: '14px' }}>
            Ward {tip.ward_number}
          </div>
          {isInactive(tip) ? (
            <div style={{ color: '#aaa' }}>No activity recorded</div>
          ) : (
            <>
              <div style={{ color: '#81c784' }}>Completed: <b>{tip.completed}</b></div>
              <div style={{ color: '#ffb74d' }}>Acknowledged: <b>{tip.acknowledged}</b></div>
              <div style={{ color: '#ef9a9a' }}>Pending: <b>{tip.pending}</b></div>
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.15)',
                marginTop: '6px', paddingTop: '6px', color: '#aaa',
              }}>
                Total: <b style={{ color: '#fff' }}>{tip.total_issues}</b>
                &nbsp;·&nbsp;
                {Math.round((tip.pending / tip.total_issues) * 100)}% pending
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────── */

function Legend() {
  return (
    <div>
      <div style={S.legendRow}>
        <span style={S.legendLabel}>All resolved</span>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '260px' }}>
          <div style={S.legendBar} />
          <div style={S.legendTicks}>
            {['0%', '25%', '50%', '75%', '100%'].map(t => <span key={t}>{t}</span>)}
          </div>
        </div>
        <span style={S.legendLabel}>All pending</span>
      </div>
      <div style={S.legendGray}>
        <div style={S.legendGrayBox} />
        <span>Gray = no activity (ward not using the system)</span>
      </div>
      <p style={S.sizeNote}>Cell size = total issues filed · Color = pending ratio</p>
    </div>
  );
}

/* ─── Rank table ─────────────────────────────────────────── */

function RankTable({ wards }) {
  return (
    <div style={S.rankTable}>
      <div style={S.rankHead}>
        <span>#</span>
        <span>Ward</span>
        <span>Total</span>
        <span style={{ color: '#2e7d32' }}>Done</span>
        <span style={{ color: '#e65100' }}>Ack'd</span>
        <span style={{ color: '#b71c1c' }}>Pending</span>
        <span>Pending %</span>
      </div>
      {wards.map((w, i) => {
        const inactive = w.total_issues === 0;
        const ratio    = w.total_issues > 0 ? w.pending / w.total_issues : 0;
        const pct      = Math.round(ratio * 100);
        return (
          <div key={w.ward_id} style={{
            ...S.rankRow,
            background: i % 2 === 0 ? '#fff' : '#fafafa',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#bbb' }}>#{i + 1}</span>
            <span style={{ fontWeight: 600 }}>Ward {w.ward_number}</span>
            <span>{w.total_issues}</span>
            <span style={{ color: '#2e7d32', fontWeight: 600 }}>{w.completed}</span>
            <span style={{ color: '#e65100', fontWeight: 600 }}>{w.acknowledged}</span>
            <span style={{ color: '#b71c1c', fontWeight: 600 }}>{w.pending}</span>
            <span>
              <span style={{
                display: 'inline-block', padding: '2px 8px',
                borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                color: '#fff',
                background: inactive ? '#aaa' : pendingColor(ratio),
              }}>
                {inactive ? 'N/A' : `${pct}%`}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */

export default function Ranking() {
  const { user } = useAuth();
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMuni,   setSelectedMuni]   = useState('');
  const [ranking,        setRanking]        = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  // If the logged-in user belongs to a municipality, lock to it.
  const userMuniId = user?.ward_display?.municipality_id
    ? String(user.ward_display.municipality_id)
    : null;

  useEffect(() => {
    getMunicipalities()
      .then(d => setMunicipalities(d.results || d))
      .catch(() => {});
    if (userMuniId) {
      setSelectedMuni(userMuniId);
    }
  }, [userMuniId]);

  useEffect(() => {
    if (!selectedMuni) { setRanking(null); return; }
    setLoading(true);
    setError(null);
    getMunicipalityRanking(selectedMuni)
      .then(d => { setRanking(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, [selectedMuni]);

  const hasData = ranking && ranking.wards.length > 0;

  const selectedMuniName = municipalities.find(
    m => String(m.id) === selectedMuni
  )?.name ?? '';

  return (
    <main style={S.shell}>
      <div style={S.inner}>
        <h1 style={S.heading}>Ward Rankings</h1>
        <p style={S.subhead}>
          Each rectangle is a ward — bigger means more issues filed. Green means most are resolved; red means most are still pending. Gray means no activity recorded.
        </p>

        {/* Admins / users without a fixed municipality get the dropdown */}
        {!userMuniId && (
          <div style={S.controls}>
            <span style={S.muniLabel}>Municipality</span>
            <select
              style={S.select}
              value={selectedMuni}
              onChange={e => setSelectedMuni(e.target.value)}
            >
              <option value="">-- Select municipality --</option>
              {municipalities.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Users with a fixed municipality just see a label */}
        {userMuniId && selectedMuniName && (
          <div style={S.muniTag}>
            <span>📍</span>
            <span style={S.muniTagName}>{selectedMuniName}</span>
          </div>
        )}

        {loading && <Spinner />}
        <ErrorBox error={error} />

        {hasData ? (
          <>
            <Treemap wards={ranking.wards} />
            <Legend />
            <RankTable wards={ranking.wards} />
          </>
        ) : ranking && !loading ? (
          <div style={S.emptyCard}>
            <p style={{ fontWeight: 700, marginBottom: '6px' }}>No data yet</p>
            <p style={{ fontSize: '13px' }}>No issues have been filed in this municipality.</p>
          </div>
        ) : !selectedMuni && !loading ? (
          <div style={S.emptyCard}>
            <p style={{ fontWeight: 700, marginBottom: '6px' }}>Select a municipality above</p>
            <p style={{ fontSize: '13px' }}>The map will show each ward's issue load and resolution status.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}