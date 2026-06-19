import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, Spinner } from './components/Common';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import CreateIssue from './pages/CreateIssue';
import WardPosts from './pages/WardPosts';
import Ranking from './pages/Ranking';
import WardIssues from './pages/WardIssues';
import WardIssueManage from './pages/WardIssueManage';
import WardPostManage from './pages/WardPostManage';
import WardAnalytics from './pages/WardAnalytics';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireWard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || !user.is_ward_account) return <Navigate to="/" replace />;
  return children;
}

function RequireCitizen({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_ward_account) return <Navigate to="/ward/issues" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Common auth routes */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Citizen routes */}
        <Route path="/issues" element={<IssueList />} />
        <Route path="/issues/new" element={<RequireCitizen><CreateIssue /></RequireCitizen>} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/ward-posts" element={<WardPosts />} />
        <Route path="/ranking" element={<Ranking />} />

        {/* Ward account routes */}
        <Route path="/ward/issues" element={<RequireWard><WardIssues /></RequireWard>} />
        <Route path="/ward/issues/:id" element={<RequireWard><WardIssueManage /></RequireWard>} />
        <Route path="/ward/posts" element={<RequireWard><WardPostManage /></RequireWard>} />
        <Route path="/ward/analytics" element={<RequireWard><WardAnalytics /></RequireWard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
