import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import NewIntakePage from './pages/NewIntakePage';
import {
  AdminDashboardPage,
  UserListPage,
  RoleListPage,
  AgencyListPage,
  FeeSchedulePage,
  YardLocationsPage,
  SettingsPage,
} from './pages/admin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute>
            <CaseListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute>
            <CaseDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intake/new"
        element={
          <ProtectedRoute>
            <NewIntakePage />
          </ProtectedRoute>
        }
      />
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <UserListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <RoleListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/agencies"
        element={
          <ProtectedRoute>
            <AgencyListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/fees"
        element={
          <ProtectedRoute>
            <FeeSchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/yard"
        element={
          <ProtectedRoute>
            <YardLocationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
