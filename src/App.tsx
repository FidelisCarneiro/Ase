import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ASEForm } from './pages/ASEForm';
import { ASEList } from './pages/ASEList';
import { Efetivo } from './pages/Efetivo';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary"><div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          <Route path="/ase/new" element={<ProtectedRoute><ASEForm /></ProtectedRoute>} />
          <Route path="/ase/edit/:id" element={<ProtectedRoute><ASEForm /></ProtectedRoute>} />
          <Route path="/ase/my" element={<ProtectedRoute><ASEList mode="my" /></ProtectedRoute>} />
          <Route path="/ase/all" element={<ProtectedRoute><ASEList mode="all" /></ProtectedRoute>} />
          
          <Route path="/cadastros/efetivo" element={<ProtectedRoute><Efetivo /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
