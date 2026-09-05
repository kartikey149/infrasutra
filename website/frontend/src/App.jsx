import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import DataCapture from './pages/DataCapture';
import VarianceEngine from './pages/VarianceEngine';
import ReportExporter from './pages/ReportExporter';
import Login from './pages/Login';

// SIH26122 Core Intelligent Pipeline Pages
import PlannerApproval from './pages/PlannerApproval';
import ScheduleExplorer from './pages/ScheduleExplorer';
import FieldUpdatePage from './pages/FieldUpdatePage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import TelegramBotWidget from './components/TelegramBotWidget';
import ChatBot from './components/ChatBot';
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AuthenticatedBot() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated || location.pathname === '/login') return null;
  return (
    <>
      <TelegramBotWidget />
      <ChatBot />
    </>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <main className="flex-1">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <AuthenticatedBot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedule"
                  element={
                    <ProtectedRoute>
                      <Schedule />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/capture"
                  element={
                    <ProtectedRoute>
                      <DataCapture />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/variance"
                  element={
                    <ProtectedRoute>
                      <VarianceEngine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <ReportExporter />
                    </ProtectedRoute>
                  }
                />

                {/* SIH26122 Schedule-Linking & Database Features */}
                <Route
                  path="/field-update"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/field%20update"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/field update"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/field_update"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fieldupdate"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/field"
                  element={
                    <ProtectedRoute>
                      <FieldUpdatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/approval"
                  element={
                    <ProtectedRoute>
                      <PlannerApproval />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedule-explorer"
                  element={
                    <ProtectedRoute>
                      <ScheduleExplorer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AnalyticsDashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AppLayout>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}