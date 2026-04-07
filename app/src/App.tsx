import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import MainLayout from '@/components/layout/MainLayout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/admin/Dashboard';
import Users from '@/pages/admin/Users';
import Upload from '@/pages/admin/Upload';
import Lists from '@/pages/admin/Lists';
import ListDetails from '@/pages/admin/ListDetails';
import Assignments from '@/pages/admin/Assignments';
import Reports from '@/pages/admin/Reports';
import StaffDashboard from '@/pages/staff/Dashboard';
import MyRecords from '@/pages/staff/MyRecords';
import EnterReading from '@/pages/staff/EnterReading';
import History from '@/pages/staff/History';

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  staffOnly?: boolean;
}> = ({ children, adminOnly, staffOnly }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (staffOnly && user?.role !== 'staff') {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// Public Route (redirects to home if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Home Redirect Component
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Dashboard />;
  }
  
  return <StaffDashboard />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute adminOnly>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lists"
        element={
          <ProtectedRoute>
            <Lists />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lists/:id"
        element={
          <ProtectedRoute adminOnly>
            <ListDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={
          <ProtectedRoute adminOnly>
            <Assignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute adminOnly>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* Staff Routes */}
      <Route
        path="/my-records"
        element={
          <ProtectedRoute staffOnly>
            <MyRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enter-reading"
        element={
          <ProtectedRoute staffOnly>
            <EnterReading />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute staffOnly>
            <History />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
