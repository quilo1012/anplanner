import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Planner } from '@/pages/Planner';
import { Downtime } from '@/pages/Downtime';
import { History } from '@/pages/History';
import { Login } from '@/pages/Login';
import { Admin } from '@/pages/Admin';

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <ShiftProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="planner" element={<Planner />} />
              <Route path="downtime" element={<Downtime />} />
              <Route path="history" element={<History />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ShiftProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
