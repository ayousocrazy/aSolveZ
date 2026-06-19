import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue, getWards, getMunicipalities, getDistricts } from '../api';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/Common';

const CATEGORIES = ['road','water','electricity','corruption','health','education','garbage','safety','other'];

export default function CreateIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ description: '', category: 'other', locality: '' });
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null); // resolved province/district/municipality/ward IDs
  const [locationLabel, setLocationLabel] = useState('Loading your location…');

  useEffect(() => {
    // The user object from /api/auth/me/ should have ward info.
    // We resolve the full chain: ward → municipality → district → province
    async function resolveLocation() {
      // Try direct fields first (if MeSerializer includes them)
      if (user?.province && user?.district && user?.municipality && user?.ward) {
        setLocation({
          province: user.province,
          district: user.district,
          municipality: user.municipality,
          ward: user.ward,
        });
        setLocationLabel(buildLabel(user));
        return;
      }

      // Fallback: if ward ID is available, fetch up the chain
      if (user?.ward) {
        try {
          const wards = await getWards();
          const wardList = wards.results || wards;
          const ward = wardList.find(w => w.id === user.ward);
          if (ward) {
            setLocation({
              province: ward.province || ward.municipality_detail?.district_detail?.province_id,
              district: ward.district || ward.municipality_detail?.district_id,
              municipality: ward.municipality,
              ward: ward.id,
            });
            setLocationLabel(`Ward ${ward.number}, ${ward.municipality_name || ''}`);
            return;
          }
        } catch {}
      }

      setLocationLabel('Could not detect location — contact support.');
    }
    if (user) resolveLocation();
  }, [user]);

  function buildLabel(u) {
    const parts = [];
    if (u.ward_detail?.number) parts.push(`Ward ${u.ward_detail.number}`);
    if (u.ward_detail?.municipality) parts.push(u.ward_detail.municipality);
    if (u.ward_detail?.district) parts.push(u.ward_detail.district);
    return parts.length ? parts.join(', ') : `Ward ID: ${u.ward}`;
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!location?.ward) {
      setError('Your account has no ward assigned. Please contact support.');
      return;
    }

    const fd = new FormData();
    fd.append('description', form.description);
    fd.append('category', form.category);
    if (form.locality) fd.append('locality', form.locality);

    // Send all location fields the backend requires
    fd.append('ward', location.ward);
    if (location.municipality) fd.append('municipality', location.municipality);
    if (location.district) fd.append('district', location.district);
    if (location.province) fd.append('province', location.province);

    if (image) fd.append('image', image);
    if (video) fd.append('video', video);

    try {
      const issue = await createIssue(fd);
      navigate(`/issues/${issue.id}`);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '32px auto', padding: '0 16px' }}>
      <h2>Submit Issue</h2>

      <div style={{ marginBottom: '16px', padding: '10px', background: '#f5f5f5' }}>
        <strong>Your location:</strong> {locationLabel}
        <br />
        <small style={{ color: '#666' }}>Issues are automatically assigned to your registered ward.</small>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>Category *</label><br />
          <select value={form.category} onChange={set('category')} required>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Description *</label><br />
          <textarea value={form.description} onChange={set('description')} required rows={5} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Locality (optional)</label><br />
          <input value={form.locality} onChange={set('locality')} style={{ width: '100%' }} placeholder="e.g. Near bus park" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Image (optional)</label><br />
          <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Video (optional, mp4/mov/avi/webm)</label><br />
          <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
        </div>
        <ErrorBox error={error} />
        <button type="submit" style={{ marginTop: '8px' }}>Submit</button>
        <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: '12px' }}>Cancel</button>
      </form>
    </div>
  );
}