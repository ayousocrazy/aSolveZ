import React, { useState, useEffect } from 'react';
import { getMunicipalities, getMunicipalityRanking } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Common';

export default function Ranking() {
  const { user } = useAuth();
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMuni, setSelectedMuni] = useState('');
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMunicipalities().then(d => setMunicipalities(d.results || d)).catch(() => {});
    // Pre-load user's municipality if available
    if (user?.ward_detail?.municipality_id) {
      setSelectedMuni(user.ward_detail.municipality_id);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedMuni) { setRanking(null); return; }
    setLoading(true);
    getMunicipalityRanking(selectedMuni)
      .then(d => { setRanking(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, [selectedMuni]);

  return (
    <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 16px' }}>
      <h2>Ward Rankings</h2>
      <div style={{ marginBottom: '16px' }}>
        <label>Select Municipality: </label>
        <select value={selectedMuni} onChange={e => setSelectedMuni(e.target.value)}>
          <option value="">-- Select --</option>
          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      {loading && <Spinner />}
      <ErrorBox error={error} />
      {ranking && (
        <>
          <h3>{ranking.municipality} — Ward Performance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Ward</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Total</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Completed</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Pending</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Rate %</th>
              </tr>
            </thead>
            <tbody>
              {ranking.wards.map((w, i) => (
                <tr key={w.ward_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>#{i + 1}</td>
                  <td style={{ padding: '8px' }}>Ward {w.ward_number}</td>
                  <td style={{ padding: '8px' }}>{w.total_issues}</td>
                  <td style={{ padding: '8px' }}>{w.completed}</td>
                  <td style={{ padding: '8px' }}>{w.pending}</td>
                  <td style={{ padding: '8px' }}>{w.completion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
