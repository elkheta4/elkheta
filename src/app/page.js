'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import Login from './(frontend)/login/Login';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAppContext();
  const router = useRouter();

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/admin/system-overview');
    router.prefetch('/user/overview');
  }, [router]);

  // Instant redirect if already logged in
  useEffect(() => {
    if (loading) return;
    if (user) {
      const targetRoute = user.role === 'Admin' 
        ? '/admin/system-overview' 
        : '/user/overview';
      router.replace(targetRoute);
    }
  }, [user, loading, router]);

  // Show loading spinner while checking session
  if (loading || user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--bg-body)'
      }}>
        <Loader2 size={40} className="spinner-spin" style={{color: 'var(--primary)'}} />
      </div>
    );
  }

  // Only show login if NOT logged in
  return <Login />;
}
