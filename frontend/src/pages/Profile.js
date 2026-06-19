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
    <div style={{ maxWidth: '480px', margin: '48px auto', padding: '0 16px' }}>
      <h2>Profile</h2>
      {user?.profile_picture && (
        <div style={{ marginBottom: '16px' }}>
          <img src={user.profile_picture} alt="Profile" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />
        </div>
      )}
      <p><strong>Phone:</strong> {user?.phone}</p>
      {user?.ward_detail && (
        <p><strong>Ward:</strong> Ward {user.ward_detail.number}, {user.ward_detail.municipality}</p>
      )}
      <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>Name</label><br />
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Email</label><br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Profile Picture</label><br />
          <input type="file" accept="image/*" onChange={e => setPicture(e.target.files[0])} />
        </div>
        {success && <p style={{ color: 'green' }}>Profile updated.</p>}
        <ErrorBox error={error} />
        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}
