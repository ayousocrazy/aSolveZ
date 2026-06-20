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
    <main className="page-shell page-pad">
      <section className="card" style={{ maxWidth: '540px', margin: '0 auto' }}>
        <h1 className="page-heading">Register</h1>
        <p className="body-copy" style={{ marginBottom: '24px' }}>Create an account to submit issues and stay connected with your ward office.</p>
        {success && <p className="body-copy" style={{ color: 'var(--color-green)', marginBottom: '18px' }}>Registered! Redirecting to login…</p>}
        <form onSubmit={handleSubmit} className="form-fieldset">
          <label className="label">
            Full Name *
            <input className="input-field" value={form.name} onChange={set('name')} required />
          </label>
          <label className="label">
            Phone *
            <input className="input-field" value={form.phone} onChange={set('phone')} required />
          </label>
          <label className="label">
            Password *
            <input className="input-field" type="password" value={form.password} onChange={set('password')} required />
          </label>
          <label className="label">
            Email (optional)
            <input className="input-field" type="email" value={form.email} onChange={set('email')} />
          </label>
          <GeoSelects value={form} onChange={setForm} required />
          <ErrorBox error={error} />
          <button type="submit" className="button-primary">Create Account</button>
        </form>
        <p className="body-copy" style={{ marginTop: '18px' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
