const BASE = '/api';

function getToken() {
  return localStorage.getItem('access');
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, path, body = null, multipart = false) {
  const headers = multipart
    ? authHeaders()
    : authHeaders({ 'Content-Type': 'application/json' });

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// Auth
export const login = (phone, password) =>
  request('POST', '/auth/login/', { phone, password });

export const register = (payload) =>
  request('POST', '/auth/register/', payload);

export const getMe = () => request('GET', '/auth/me/');

export const updateMe = (formData) =>
  request('PATCH', '/auth/me/update/', formData, true);

// Geo
export const getProvinces = () => request('GET', '/provinces/');
export const getDistricts = (provinceId) =>
  request('GET', `/districts/${provinceId ? `?province=${provinceId}` : ''}`);
export const getMunicipalities = (districtId) =>
  request('GET', `/municipalities/${districtId ? `?district=${districtId}` : ''}`);
export const getWards = (municipalityId) =>
  request('GET', `/wards/${municipalityId ? `?municipality=${municipalityId}` : ''}`);

// Issues
export const getIssues = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request('GET', `/issues/${q ? `?${q}` : ''}`);
};
export const getIssue = (id) => request('GET', `/issues/${id}/`);
export const createIssue = (formData) =>
  request('POST', '/issues/', formData, true);
export const deleteIssue = (id) => request('DELETE', `/issues/${id}/`);

// Ward issues (ward account)
export const getWardIssues = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request('GET', `/ward/issues/${q ? `?${q}` : ''}`);
};
export const updateWardIssue = (id, formData) =>
  request('PATCH', `/ward/issues/${id}/`, formData, true);

// Comments
export const getComments = (issueId) =>
  request('GET', `/issues/${issueId}/comments/`);
export const createComment = (issueId, text) =>
  request('POST', `/issues/${issueId}/comments/`, { text });
export const deleteComment = (issueId, commentId) =>
  request('DELETE', `/issues/${issueId}/comments/${commentId}/`);

// Vote
export const vote = (issueId, value) =>
  request('POST', `/issues/${issueId}/vote/`, { value });

// Report
export const report = (targetType, targetId, reason, note = '') =>
  request('POST', `/report/${targetType}/${targetId}/`, { reason, note });

// Ward posts
export const getWardPosts = (wardId) =>
  request('GET', `/ward-posts/${wardId ? `?ward=${wardId}` : ''}`);
export const createWardPost = (formData) =>
  request('POST', '/ward/posts/', formData, true);
export const updateWardPost = (id, formData) =>
  request('PATCH', `/ward/posts/${id}/`, formData, true);
export const deleteWardPost = (id) =>
  request('DELETE', `/ward/posts/${id}/`);

// Analytics
export const getWardAnalytics = () => request('GET', '/ward/analytics/');

// Municipality ranking
export const getMunicipalityRanking = (municipalityId) =>
  request('GET', `/municipalities/${municipalityId}/ranking/`);
