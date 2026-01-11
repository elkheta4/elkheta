'use client';
import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar'; 
import DashboardLayout from '@/components/common/DashboardLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AdminLayout({ children }) {
  const { user, loading } = useAppContext();
  const router = useRouter();

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/user/overview');
    router.prefetch('/');
  }, [router]);

  // Compute authorization state
  const authState = useMemo(() => {
    if (loading) return 'loading';
    if (!user) return 'unauthenticated';
    if (user.role !== 'Admin') return 'unauthorized';
    return 'authorized';
  }, [user, loading]);

  // Handle redirects
  useEffect(() => {
    if (authState === 'unauthenticated') {
      router.replace('/');
    } else if (authState === 'unauthorized') {
      router.replace('/user/overview');
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
    <ErrorBoundary name="AdminLayout">
      <DashboardLayout SidebarComponent={Sidebar} headerTitle="Dashboard">
        {children}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
