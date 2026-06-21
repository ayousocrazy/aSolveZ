// wardAnalyticsUtils.js
//
// Pure client-side analytics. Deliberately backend-agnostic: everything here
// is derived from the issue objects already returned by GET /api/ward/issues/
// (id, category, status, created_at, updated_at, ...).
//
// IMPORTANT CAVEAT — read before trusting the numbers in a board meeting:
// The API does not currently store a dedicated "acknowledged_at" or
// "completed_at" timestamp, only `updated_at` (which is bumped on *any*
// edit to the issue, not just a status change). So "response time" and
// "resolution time" below are an approximation: time from `created_at` to
// the most recent `updated_at`, for issues that have left the "pending"
// state. It's a reasonable proxy in practice (most issues are only touched
// once or twice), but it will overstate the time if a ward edits an issue
// multiple times after acting on it. If you want exact figures later, add
// `acknowledged_at` / `completed_at` fields on the backend and swap the
// two `hoursBetween(...)` calls in computeWardStats for the real fields —
// nothing else in this file needs to change.

const MS_PER_HOUR = 1000 * 60 * 60;

export const CATEGORY_LABELS = {
  road: 'Road',
  water: 'Water',
  electricity: 'Electricity',
  corruption: 'Corruption',
  health: 'Health',
  education: 'Education',
  garbage: 'Garbage',
  safety: 'Safety',
  other: 'Other',
};

// Stable, distinguishable colors per category for the breakdown bars.
export const CATEGORY_COLORS = {
  road: '#5B7BA6',
  water: '#3A8FB7',
  electricity: '#D9A441',
  corruption: '#B5384E',
  health: '#4F9D69',
  education: '#7A63A8',
  garbage: '#8C7355',
  safety: '#C8102E',
  other: '#8A8F98',
};

export function hoursBetween(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / MS_PER_HOUR;
}

export function formatDuration(hours) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return 'N/A';
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const hrs = Math.floor((totalMinutes % 1440) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hrs || parts.length === 0) parts.push(`${hrs}h`);
  return parts.join(' ');
}

function average(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function lastNMonths(n) {
  const months = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i += 1) {
    months.unshift(new Date(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return months;
}

/**
 * Computes ward-level analytics from a flat array of issue objects
 * (as returned by GET /api/ward/issues/).
 */
export function computeWardStats(issues) {
  const total = issues.length;
  const pending = issues.filter((i) => i.status === 'pending').length;
  const acknowledged = issues.filter((i) => i.status === 'acknowledged').length;
  const completed = issues.filter((i) => i.status === 'completed').length;
  const completionRate = total ? Math.round((completed / total) * 1000) / 10 : 0;

  const responded = issues.filter((i) => i.status !== 'pending');
  const responseHours = responded
    .map((i) => hoursBetween(i.created_at, i.updated_at))
    .filter((h) => h !== null);

  const resolved = issues.filter((i) => i.status === 'completed');
  const resolutionHours = resolved
    .map((i) => hoursBetween(i.created_at, i.updated_at))
    .filter((h) => h !== null);

  const avgResponseHours = average(responseHours);
  const avgResolutionHours = average(resolutionHours);
  const fastestResolutionHours = resolutionHours.length ? Math.min(...resolutionHours) : null;
  const slowestResolutionHours = resolutionHours.length ? Math.max(...resolutionHours) : null;

  const categoryCounts = {};
  issues.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      color: CATEGORY_COLORS[category] || '#8A8F98',
      count,
      percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const months = lastNMonths(6);
  const monthlyTrend = months.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const inMonth = issues.filter((i) => {
      const created = new Date(i.created_at);
      return created >= monthStart && created < monthEnd;
    });
    return {
      label: monthStart.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      submitted: inMonth.length,
      completed: inMonth.filter((i) => i.status === 'completed').length,
    };
  });

  return {
    total,
    pending,
    acknowledged,
    completed,
    completionRate,
    avgResponseHours,
    avgResolutionHours,
    fastestResolutionHours,
    slowestResolutionHours,
    responseSampleSize: responseHours.length,
    resolutionSampleSize: resolutionHours.length,
    categoryBreakdown,
    monthlyTrend,
  };
}