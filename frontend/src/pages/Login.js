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
    <div style={{ maxWidth: '400px', margin: '48px auto', padding: '0 16px' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>Phone *</label><br />
          <input value={phone} onChange={e => setPhone(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Password *</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <ErrorBox error={error} />
        <button type="submit" style={{ marginTop: '12px' }}>Login</button>
      </form>
      <p style={{ marginTop: '16px' }}>No account? <Link to="/register">Register</Link></p>
    </div>
  );
}
