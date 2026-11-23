import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentApp from './pages/student/StudentApp';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { lazy, Suspense, useState } from 'react';

import ErrorBoundary from './components/ErrorBoundary';

const HistoryStoryHall = lazy(() => import('./pages/student/HistoryStoryHall'));
const DailyMissionHall = lazy(() => import('./pages/student/DailyMissionHall'));

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('leon_admin_auth') === 'true';
  });

  const handleLoginSuccess = () => {
    localStorage.setItem('leon_admin_auth', 'true');
    setIsAdminAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('leon_admin_auth');
    setIsAdminAuthenticated(false);
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Frontend Learning App */}
          <Route path="/" element={<StudentApp />} />
          <Route path="/mission" element={
            <Suspense fallback={<p role="status">正在打开今日学习通关台…</p>}>
              <DailyMissionHall />
            </Suspense>
          } />
          <Route path="/history" element={
            <Suspense fallback={<p role="status">正在打开故事书架…</p>}>
              <HistoryStoryHall />
            </Suspense>
          } />

          {/* Independent Admin Backend */}
          <Route path="/admin" element={
            isAdminAuthenticated ? 
            <Navigate to="/admin/dashboard" replace /> : 
            <AdminLogin onLogin={handleLoginSuccess} />
          } />
          
          <Route path="/admin/dashboard/*" element={
            isAdminAuthenticated ? 
            <AdminDashboard onLogout={handleLogout} /> : 
            <Navigate to="/admin" replace />
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
