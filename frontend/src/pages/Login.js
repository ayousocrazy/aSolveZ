import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMe } from '../api';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/Common';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { access, refresh } = await login(phone, password);
      localStorage.setItem('access', access);
      const me = await getMe();
      loginUser(access, refresh, me);
      navigate(me.is_ward_account ? '/ward/issues' : '/issues');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <main className="page-shell page-pad">
      <section className="card" style={{ maxWidth: '440px', margin: '0 auto' }}>
        <h1 className="page-heading">Login</h1>
        <p className="body-copy" style={{ marginBottom: '24px' }}>Sign in to access your ward dashboard or citizen services.</p>
        <form onSubmit={handleSubmit} className="form-fieldset">
          <label className="label">
            Phone *
            <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} required />
          </label>
          <label className="label">
            Password *
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <ErrorBox error={error} />
          <button type="submit" className="button-primary">Login</button>
        </form>
        <p className="body-copy" style={{ marginTop: '18px' }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}
