import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) { setLoading(false); return; }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const loginUser = (access, refresh, userData) => {
    localStorage.setItem('access', access);
    localStorage.setItem('refresh', refresh);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, reloadUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
