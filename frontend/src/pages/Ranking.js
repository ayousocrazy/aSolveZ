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
    <main className="page-shell page-pad">
      <div className="card" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h1 className="page-heading">Ward Rankings</h1>
        <p className="body-copy" style={{ marginBottom: '24px' }}>Compare ward performance across your municipality and spot trends at a glance.</p>

        <label className="label" style={{ display: 'block', marginBottom: '20px' }}>
          Select Municipality
          <select className="select-field" value={selectedMuni} onChange={e => setSelectedMuni(e.target.value)}>
            <option value="">-- Select --</option>
            {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        {loading && <Spinner />}
        <ErrorBox error={error} />

        {ranking ? (
          <div className="panel-card">
            <h2 className="section-heading">{ranking.municipality} — Ward Performance</h2>
            <table className="table-ui">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Ward</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Rate %</th>
                </tr>
              </thead>
              <tbody>
                {ranking.wards.map((w, i) => (
                  <tr key={w.ward_id}>
                    <td>#{i + 1}</td>
                    <td>Ward {w.ward_number}</td>
                    <td>{w.total_issues}</td>
                    <td>{w.completed}</td>
                    <td>{w.pending}</td>
                    <td>{w.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedMuni && !loading ? (
          <div className="empty-state-card">
            <p className="screen-title">No ranking data yet</p>
            <p className="body-copy">This municipality has not published ranking data for the selected ward group.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
