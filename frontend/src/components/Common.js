import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ padding: '12px 24px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Link to="/" style={{ fontWeight: 'bold', marginRight: 'auto' }}>WardConnect</Link>
      {user ? (
        <>
          {user.is_ward_account ? (
            <>
              <Link to="/ward/issues">Issues</Link>
              <Link to="/ward/posts">Posts</Link>
              <Link to="/ward/analytics">Analytics</Link>
            </>
          ) : (
            <>
              <Link to="/issues">Issues</Link>
              <Link to="/ward-posts">Ward Feed</Link>
              <Link to="/ranking">Rankings</Link>
            </>
          )}
          <Link to="/profile">Profile</Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error
    : Object.entries(error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
  return <div style={{ marginTop: '8px', color: 'red' }}>{msg}</div>;
}

export function Spinner() {
  return <div style={{ margin: '16px 0' }}>Loading…</div>;
}

export function GeoSelects({ value, onChange, required = false }) {
  const [provinces, setProvinces] = React.useState([]);
  const [districts, setDistricts] = React.useState([]);
  const [municipalities, setMunicipalities] = React.useState([]);
  const [wards, setWards] = React.useState([]);

  React.useEffect(() => {
    import('../api').then(api => api.getProvinces().then(setProvinces).catch(() => {}));
  }, []);

  React.useEffect(() => {
    if (!value.province) { setDistricts([]); return; }
    import('../api').then(api => api.getDistricts(value.province).then(d => setDistricts(d.results || d)).catch(() => {}));
  }, [value.province]);

  React.useEffect(() => {
    if (!value.district) { setMunicipalities([]); return; }
    import('../api').then(api => api.getMunicipalities(value.district).then(d => setMunicipalities(d.results || d)).catch(() => {}));
  }, [value.district]);

  React.useEffect(() => {
    if (!value.municipality) { setWards([]); return; }
    import('../api').then(api => api.getWards(value.municipality).then(d => setWards(d.results || d)).catch(() => {}));
  }, [value.municipality]);

  const handle = (field) => (e) => {
    const v = e.target.value;
    const reset = {};
    if (field === 'province') { reset.district = ''; reset.municipality = ''; reset.ward = ''; }
    if (field === 'district') { reset.municipality = ''; reset.ward = ''; }
    if (field === 'municipality') { reset.ward = ''; }
    onChange({ ...value, [field]: v, ...reset });
  };

  return (
    <>
      <div style={{ marginBottom: '8px' }}>
        <label>Province{required && ' *'}</label><br />
        <select value={value.province || ''} onChange={handle('province')} required={required}>
          <option value="">-- Select Province --</option>
          {(provinces.results || provinces).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>District{required && ' *'}</label><br />
        <select value={value.district || ''} onChange={handle('district')} required={required} disabled={!value.province}>
          <option value="">-- Select District --</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>Municipality{required && ' *'}</label><br />
        <select value={value.municipality || ''} onChange={handle('municipality')} required={required} disabled={!value.district}>
          <option value="">-- Select Municipality --</option>
          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>Ward{required && ' *'}</label><br />
        <select value={value.ward || ''} onChange={handle('ward')} required={required} disabled={!value.municipality}>
          <option value="">-- Select Ward --</option>
          {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number}</option>)}
        </select>
      </div>
    </>
  );
}
