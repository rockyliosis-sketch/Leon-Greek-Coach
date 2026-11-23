import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DailyMissionHall from './pages/student/DailyMissionHall';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { lazy, Suspense, useState } from 'react';

import ErrorBoundary from './components/ErrorBoundary';

const StudentApp = lazy(() => import('./pages/student/StudentApp'));
const HistoryStoryHall = lazy(() => import('./pages/student/HistoryStoryHall'));

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
          {/* Frontend Learning App: Daily Mission Dashboard is now Home */}
          <Route path="/" element={<DailyMissionHall />} />
          <Route path="/mission" element={<Navigate to="/" replace />} />
          <Route path="/practice" element={
            <Suspense fallback={<p role="status" style={{ padding: 24 }}>正在打开每日刷题训练中心…</p>}>
              <StudentApp />
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
