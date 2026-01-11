'use client';
import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/user/Sidebar'; 
import DashboardLayout from '@/components/common/DashboardLayout';
import { UserDashboardProvider } from '@/context/UserDashboardContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function UserLayout({ children }) {
  const { user, loading } = useAppContext();
  const router = useRouter();

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/admin/system-overview');
    router.prefetch('/');
  }, [router]);

  // Compute authorization state
  const authState = useMemo(() => {
    if (loading) return 'loading';
    if (!user) return 'unauthenticated';
    if (user.role === 'Admin') return 'unauthorized';
    return 'authorized';
  }, [user, loading]);

  // Handle redirects
  useEffect(() => {
    if (authState === 'unauthenticated') {
      router.replace('/');
    } else if (authState === 'unauthorized') {
      router.replace('/admin/system-overview');
    }
  }, [authState, router]);

  // Loading state - minimal flash
  if (authState === 'loading') {
    return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body)' }} />;
  }

  // Redirecting states - show nothing to prevent flash
  if (authState === 'unauthenticated' || authState === 'unauthorized') {
    return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body)' }} />;
  }

  // Authorized - render dashboard
  return (
    <ErrorBoundary name="UserLayout">
      <UserDashboardProvider>
        <DashboardLayout SidebarComponent={Sidebar} headerTitle="My Workspace">
          {children}
        </DashboardLayout>
      </UserDashboardProvider>
    </ErrorBoundary>
  );
}
