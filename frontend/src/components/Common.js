import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavLink({ to, children }) {
  return (
    <Link to={to} className="nav-link">
      {children}
    </Link>
  );
}

const NAV_TEXT = {
  en: {
    issues: 'Issues',
    posts: 'Posts',
    analytics: 'Analytics',
    wardFeed: 'Ward Feed',
    rankings: 'Rankings',
    profile: 'Profile',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
  },
  ne: {
    issues: 'समस्या',
    posts: 'पोष्टहरू',
    analytics: 'विश्लेषण',
    wardFeed: 'वार्ड फिड',
    rankings: 'र्याङ्किङ',
    profile: 'प्रोफाइल',
    login: 'लगइन',
    register: 'रजिस्टर',
    logout: 'लगआउट',
  },
};

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [locale, setLocale] = React.useState('en');
  const t = (key) => NAV_TEXT[locale][key] || key;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="seal">
          <span className="seal-icon">W</span>
        </div>
        <div>
          <p className="screen-title">WardConnect</p>
          <p className="body-copy">Local complaints, managed with care.</p>
        </div>
      </div>

      <nav className="navbar-links">
        {user ? (
          <>
            {user.is_ward_account ? (
              <>
                <NavLink to="/ward/issues">{t('issues')}</NavLink>
                <NavLink to="/ward/posts">{t('posts')}</NavLink>
                <NavLink to="/ward/analytics">{t('analytics')}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/issues">{t('issues')}</NavLink>
                <NavLink to="/ward-posts">{t('wardFeed')}</NavLink>
                <NavLink to="/ranking">{t('rankings')}</NavLink>
              </>
            )}
            <NavLink to="/profile">{t('profile')}</NavLink>
            <button type="button" className="button-secondary" onClick={handleLogout}>{t('logout')}</button>
          </>
        ) : (
          <>
            <NavLink to="/login">{t('login')}</NavLink>
            <NavLink to="/register">{t('register')}</NavLink>
          </>
        )}
        <button type="button" className="button-tertiary locale-toggle" onClick={() => setLocale((prev) => (prev === 'en' ? 'ne' : 'en'))}>
          {locale === 'en' ? 'नेपाली' : 'EN'}
        </button>
      </nav>
    </header>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  const msg = typeof error === 'string'
    ? error
    : Object.entries(error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
  return <div className="error-box">{msg}</div>;
}

export function Spinner() {
  return (
    <div className="spinner-shell">
      <div className="spinner" aria-label="Loading content" />
      <p className="body-copy">Loading content…</p>
    </div>
  );
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
    <div className="geo-grid">
      <div>
        <label className="label">Province{required && ' *'}</label>
        <select className="select-field" value={value.province || ''} onChange={handle('province')} required={required}>
          <option value="">-- Select Province --</option>
          {(provinces.results || provinces).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">District{required && ' *'}</label>
        <select className="select-field" value={value.district || ''} onChange={handle('district')} required={required} disabled={!value.province}>
          <option value="">-- Select District --</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Municipality{required && ' *'}</label>
        <select className="select-field" value={value.municipality || ''} onChange={handle('municipality')} required={required} disabled={!value.district}>
          <option value="">-- Select Municipality --</option>
          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Ward{required && ' *'}</label>
        <select className="select-field" value={value.ward || ''} onChange={handle('ward')} required={required} disabled={!value.municipality}>
          <option value="">-- Select Ward --</option>
          {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number}</option>)}
        </select>
      </div>
    </div>
  );
}
