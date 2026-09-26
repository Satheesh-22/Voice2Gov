// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ roles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner fullPage />;
  if (!user)     return <Navigate to="/login" replace />;

  // Role guard — redirect home if user doesn't have the required role
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
