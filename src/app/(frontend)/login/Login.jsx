'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Loader2, User, Lock } from 'lucide-react';
const logo = '/images/logo.webp';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user, loading } = useAppContext();
  const router = useRouter();

  // Prefetch both routes on mount for instant navigation
  useEffect(() => {
    router.prefetch('/admin/system-overview');
    router.prefetch('/user/overview');
  }, [router]);

  // Redirect if already logged in
  useEffect(() => {
    if (loading) return;
    if (user) {
      const targetRoute = user.role === 'Admin'
        ? '/admin/system-overview'
        : '/user/overview';
      router.replace(targetRoute);
    }
  }, [user, loading, router]);

  // Show nothing while checking session (prevents flicker)
  if (loading) {
    return (
      <div className="login-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader2 size={32} className="spinner-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(username, password);
      if (!result.success) {
        // Localize specific errors
        let msg = result.error;
        if (msg === 'Missing credentials') msg = 'من فضلك ادخل اسم المستخدم وكلمة المرور';
        else if (msg === 'Invalid credentials') msg = 'اسم المستخدم أو كلمة المرور غلط';
        else msg = 'حدث خطأ غير متوقع: ' + msg;

        setError(msg);
        setIsSubmitting(false);
      } else {
        // INSTANT navigation - page is already prefetched, context state is updated
        const targetRoute = result.user?.role === 'Admin'
          ? '/admin/system-overview'
          : '/user/overview';
        router.replace(targetRoute);
      }
    } catch (err) {
      console.error('[Login] Submit Error:', err);

      // Check for specific backend errors that come as exceptions
      let msg = err.message;
      if (msg === 'Missing credentials') {
        setError('من فضلك ادخل اسم المستخدم وكلمة المرور');
      } else if (msg === 'Invalid credentials') {
        setError('اسم المستخدم أو كلمة المرور غلط');
      } else if (msg === 'Failed to fetch' || msg.includes('Network')) {
        setError('في مشكلة في النت، اتأكد من الوصلة وحاول تاني');
      } else {
        // Fallback for other errors
        setError('حدث خطأ غير متوقع: ' + msg);
      }

      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
          <h3 className="login-title">❤️💸 اهلا بيك في الخطة</h3>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="username" className="login-label">Username</label>
            <div className="login-input-wrapper">
              <User className="login-field-icon" size={18} />
              <input
                type="text"
                id="username"
                name="username"
                className="login-input with-icon"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
          </div>

          <div className="login-form-group">
            <label htmlFor="password" className="login-label">Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-field-icon" size={18} />
              <input
                type="password"
                id="password"
                name="password"
                className="login-input with-icon"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isSubmitting && <Loader2 size={18} className="spinner-spin" />}
            {isSubmitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>

          {error && <div className="login-error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default Login;
