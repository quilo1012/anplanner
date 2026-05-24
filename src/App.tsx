import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { History } from '@/pages/History';
import { Login } from '@/pages/Login';
import { Loader2 } from 'lucide-react';

// Lazy load heavy pages
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));

const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));
const WeeklyReport = lazy(() => import('@/pages/WeeklyReport').then(m => ({ default: m.WeeklyReport })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const Products = lazy(() => import('@/pages/Products').then(m => ({ default: m.Products })));


function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ShiftProvider>
                  <Layout />
                </ShiftProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="planner" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><Planner /></Suspense></ProtectedRoute>} />
            <Route path="products" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><Products /></Suspense></ProtectedRoute>} />
            <Route path="downtime" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><Downtime /></Suspense></ProtectedRoute>} />
            <Route path="history" element={<ProtectedRoute allowedRoles={['operator', 'supervisor', 'admin']}><History /></ProtectedRoute>} />
            <Route path="weekly-report" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><WeeklyReport /></Suspense></ProtectedRoute>} />
            
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageLoader />}><Admin /></Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
