import React, { useState } from 'react';
import { Lock, User, ShieldCheck } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    
    // Support combination of admin/admin123/123456 for robust login
    if (
      (cleanUser === 'admin' || cleanUser === 'admin123') &&
      (cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === '123456')
    ) {
      onLogin();
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5F5F7',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        padding: '40px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #FF9500, #FF3B30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            marginBottom: '16px',
            boxShadow: '0 8px 20px rgba(255,149,0,0.2)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '26px', fontWeight: 800, color: '#1D1D1F' }}>家长控制中心</h2>
          <p style={{ fontSize: '14px', color: '#86868B', marginTop: '4px' }}>请输入管理员账号密码</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-input-group" style={{ marginBottom: 0 }}>
            <label className="admin-label">管理员账号</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="admin-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px' }}
            />
          </div>

          <div className="admin-input-group" style={{ marginBottom: 0 }}>
            <label className="admin-label">登录密码</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px' }}
            />
          </div>

          {error && (
            <p style={{ color: '#FF3B30', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-premium btn-blue-filled"
            style={{ padding: '14px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '12px', marginTop: '8px' }}
          >
            登录后台
          </button>
        </form>
      </div>
    </div>
  );
}
