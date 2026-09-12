import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InspectNew } from './pages/InspectNew';
import { InspectResults } from './pages/InspectResults';
import { HistoryPage } from './pages/HistoryPage';
import { ProductsPage } from './pages/ProductsPage';
import { RulesPage } from './pages/RulesPage';
import { LegalSourcesPage } from './pages/LegalSourcesPage';
import { RuleUpdatesPage } from './pages/RuleUpdatesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/inspect/new" element={<InspectNew />} />
                      <Route path="/inspect/:id/results" element={<InspectResults />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/rules" element={<RulesPage />} />
                      <Route path="/legal-sources" element={<LegalSourcesPage />} />
                      <Route path="/rule-updates" element={<RuleUpdatesPage />} />
                      <Route path="/audit-logs" element={<AuditLogsPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </main>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
