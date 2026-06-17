import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Lazy load heavy pages
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const History = lazy(() => import('@/pages/History').then(m => ({ default: m.History })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));
const QualityActionTypes = lazy(() => import('@/pages/QualityActionTypes').then(m => ({ default: m.QualityActionTypes })));
const QualityActionsLog = lazy(() => import('@/pages/QualityActionsLog').then(m => ({ default: m.QualityActionsLog })));
const WeeklyReport = lazy(() => import('@/pages/WeeklyReport').then(m => ({ default: m.WeeklyReport })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const Products = lazy(() => import('@/pages/Products').then(m => ({ default: m.Products })));
const WorkOrders = lazy(() => import('@/pages/maintenance/WorkOrders').then(m => ({ default: m.WorkOrders })));
const WorkOrderDetail = lazy(() => import('@/pages/maintenance/WorkOrderDetail').then(m => ({ default: m.WorkOrderDetail })));
const Engineers = lazy(() => import('@/pages/maintenance/Engineers').then(m => ({ default: m.Engineers })));
const Machines = lazy(() => import('@/pages/maintenance/Machines').then(m => ({ default: m.Machines })));
const SpareParts = lazy(() => import('@/pages/maintenance/SpareParts').then(m => ({ default: m.SpareParts })));
const TabletKiosk = lazy(() => import('@/pages/maintenance/TabletKiosk').then(m => ({ default: m.TabletKiosk })));
const DeviceSetup = lazy(() => import('@/pages/maintenance/DeviceSetup').then(m => ({ default: m.DeviceSetup })));


function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

/** Engineers should land on Work Orders, not the production Dashboard. */
function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'engineer') {
    return <Navigate to="/maintenance/work-orders" replace />;
  }
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
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
            <Route index element={<HomeRedirect />} />
            <Route path="planner" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><Planner /></Suspense></ProtectedRoute>} />
            <Route path="products" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><Products /></Suspense></ProtectedRoute>} />
            
            <Route path="history" element={<ProtectedRoute allowedRoles={['operator', 'supervisor', 'admin']}><Suspense fallback={<PageLoader />}><History /></Suspense></ProtectedRoute>} />
            <Route path="weekly-report" element={<ProtectedRoute allowedRoles={['supervisor', 'admin']}><Suspense fallback={<PageLoader />}><WeeklyReport /></Suspense></ProtectedRoute>} />
            
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageLoader />}><Admin /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="quality-action-types"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageLoader />}><QualityActionTypes /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="quality-actions-log"
              element={
                <ProtectedRoute allowedRoles={['operator', 'supervisor', 'admin']}>

                  <Suspense fallback={<PageLoader />}><QualityActionsLog /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/work-orders"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin', 'engineer', 'operator']}>
                  <Suspense fallback={<PageLoader />}><WorkOrders /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/work-orders/:id"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin', 'engineer', 'operator']}>
                  <Suspense fallback={<PageLoader />}><WorkOrderDetail /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/engineers"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin', 'engineer']}>
                  <Suspense fallback={<PageLoader />}><Engineers /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/machines"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin', 'engineer']}>
                  <Suspense fallback={<PageLoader />}><Machines /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/spare-parts"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
                  <Suspense fallback={<PageLoader />}><SpareParts /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/tablet"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin', 'engineer', 'operator']}>
                  <Suspense fallback={<PageLoader />}><TabletKiosk /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance/device-setup"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageLoader />}><DeviceSetup /></Suspense>
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
