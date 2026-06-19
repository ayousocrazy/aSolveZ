import React, { useState, useEffect } from 'react';
import { getWardAnalytics } from '../api';
import { Spinner, ErrorBox } from '../components/Common';

export default function WardAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getWardAnalytics()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: '560px', margin: '32px auto', padding: '0 16px' }}>
      <h2>Analytics</h2>
      <ErrorBox error={error} />
      {data && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Municipality', data.municipality],
              ['Ward Number', data.ward_number],
              ['Total Issues', data.total_issues],
              ['Pending', data.pending],
              ['Acknowledged', data.acknowledged],
              ['Completed', data.completed],
              ['Completion Rate', data.total_issues > 0
                ? `${Math.round((data.completed / data.total_issues) * 100)}%`
                : 'N/A'],
              ['False Resolution Reports', data.false_resolution_reports],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 0', color: '#555' }}>{label}</td>
                <td style={{ padding: '10px 0', fontWeight: 'bold' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
