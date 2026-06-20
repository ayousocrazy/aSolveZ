import React, { useState } from 'react';
import { updateMe } from '../api';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/Common';

export default function Profile() {
  const { user, reloadUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [picture, setPicture] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    if (picture) fd.append('profile_picture', picture);
    try {
      await updateMe(fd);
      await reloadUser();
      setSuccess(true);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <main className="page-shell page-pad">
      <section className="card" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <h1 className="page-heading">Profile</h1>
        {user?.profile_picture && (
          <div style={{ marginBottom: '18px' }}>
            <img src={user.profile_picture} alt="Profile" style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '50%' }} />
          </div>
        )}
        <div className="body-copy" style={{ marginBottom: '18px' }}>
          <p><strong>Phone:</strong> {user?.phone}</p>
          {user?.ward_detail && (
            <p><strong>Ward:</strong> Ward {user.ward_detail.number}, {user.ward_detail.municipality}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="form-fieldset">
          <label className="label">
            Name
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="label">
            Email
            <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="label">
            Profile Picture
            <input type="file" accept="image/*" onChange={e => setPicture(e.target.files[0])} />
          </label>
          {success && <p className="body-copy" style={{ color: 'var(--color-green)' }}>Profile updated.</p>}
          <ErrorBox error={error} />
          <button type="submit" className="button-primary">Save Changes</button>
        </form>
      </section>
    </main>
  );
}
