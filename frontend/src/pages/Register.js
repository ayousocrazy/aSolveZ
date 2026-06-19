import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { ErrorBox, GeoSelects } from '../components/Common';

export default function Register() {
  const [form, setForm] = useState({
    name: '', phone: '', password: '', email: '',
    province: '', district: '', municipality: '', ward: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await register({
        name: form.name,
        phone: form.phone,
        password: form.password,
        email: form.email || undefined,
        ward: form.ward || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '48px auto', padding: '0 16px' }}>
      <h2>Register</h2>
      {success && <p style={{ color: 'green' }}>Registered! Redirecting to login…</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>Full Name *</label><br />
          <input value={form.name} onChange={set('name')} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Phone *</label><br />
          <input value={form.phone} onChange={set('phone')} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Password *</label><br />
          <input type="password" value={form.password} onChange={set('password')} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Email (optional)</label><br />
          <input type="email" value={form.email} onChange={set('email')} style={{ width: '100%' }} />
        </div>
        <GeoSelects value={form} onChange={setForm} required />
        <ErrorBox error={error} />
        <button type="submit" style={{ marginTop: '12px' }}>Create Account</button>
      </form>
      <p style={{ marginTop: '16px' }}>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
