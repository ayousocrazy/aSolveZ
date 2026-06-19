import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '640px', margin: '64px auto', padding: '0 16px' }}>
      <h1>WardConnect</h1>
      <p>A citizen complaint and ward management platform connecting citizens with their local ward office.</p>

      {!user ? (
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <Link to="/login"><button>Login</button></Link>
          <Link to="/register"><button>Register</button></Link>
        </div>
      ) : user.is_ward_account ? (
        <div style={{ marginTop: '24px' }}>
          <p>Logged in as ward account.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/ward/issues"><button>View Issues</button></Link>
            <Link to="/ward/posts"><button>Manage Posts</button></Link>
            <Link to="/ward/analytics"><button>Analytics</button></Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '24px' }}>
          <p>Welcome, {user.name}.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/issues"><button>Browse Issues</button></Link>
            <Link to="/issues/new"><button>Submit Issue</button></Link>
            <Link to="/ward-posts"><button>Ward Feed</button></Link>
            <Link to="/ranking"><button>Rankings</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
