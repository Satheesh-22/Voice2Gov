// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar          from './components/Navbar';
import ProtectedRoute  from './components/ProtectedRoute';
import Login           from './pages/Login';
import Register        from './pages/Register';
import Home            from './pages/Home';
import Submit          from './pages/Submit';
import Issues          from './pages/Issues';
import ComplaintDetail from './pages/ComplaintDetail';
import Dashboard       from './pages/Dashboard';
import AIChat          from './pages/AIChat';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/"           element={<Home />} />
          <Route path="/submit"     element={<Submit />} />
          <Route path="/issues"     element={<Issues />} />
          <Route path="/issues/:id" element={<ComplaintDetail />} />
          <Route path="/chat"       element={<AIChat />} />
        </Route>

        {/* Protected — admin or department only */}
        <Route element={<ProtectedRoute roles={['admin','department']} />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
