import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentApp from './pages/student/StudentApp';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { useState } from 'react';

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
    <Router>
      <Routes>
        {/* Frontend Learning App */}
        <Route path="/" element={<StudentApp />} />

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
  );
}

export default App;
