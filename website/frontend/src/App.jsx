import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import Navbar from './components/Navbar';
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
  if (!isAuthenticated) return null;
  return <TelegramBotWidget />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
            <Navbar />
            <main>
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
            </main>
            <AuthenticatedBot />
          </div>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}