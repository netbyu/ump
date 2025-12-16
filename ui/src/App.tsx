import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ExtensionsPage } from './pages/Extensions';
import { ExtensionDetailPage } from './pages/ExtensionDetail';
import { QueuesPage } from './pages/Queues';
import { QueueDetailPage } from './pages/QueueDetail';
import { CdrPage } from './pages/Cdr';
import { SettingsPage } from './pages/Settings';
import { VoicemailPage } from './pages/Voicemail';
import { ActiveCallsPage } from './pages/ActiveCalls';
import { AuditLogPage } from './pages/AuditLog';
import { UsersPage } from './pages/Users';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="extensions" element={<ExtensionsPage />} />
            <Route path="extensions/:id" element={<ExtensionDetailPage />} />
            <Route path="queues" element={<QueuesPage />} />
            <Route path="queues/:name" element={<QueueDetailPage />} />
            <Route path="voicemail" element={<VoicemailPage />} />
            <Route path="calls" element={<ActiveCallsPage />} />
            <Route path="cdr" element={<CdrPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit" element={<AuditLogPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
