'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import './DashboardLayout.css';

const DashboardLayout = ({ SidebarComponent, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Default to true. The Script in layout.js handles the 'false' case via CSS override.
  const [isDesktopVisible, setIsDesktopVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  const mainContentRef = React.useRef(null);

  // Persistence Logic
  React.useLayoutEffect(() => {
    // 1. Sync with the global script on mount
    const isHiddenGlobal = document.documentElement.classList.contains('sidebar-hidden');
    if (isHiddenGlobal) {
      setIsDesktopVisible(false);
    }

    // Also double check storage in case script failed or something
    const saved = localStorage.getItem('sidebar-visible');
    if (saved === 'false') {
      setIsDesktopVisible(false);
      document.documentElement.classList.add('sidebar-hidden');
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // 2. Sync State -> Storage & HTML Class
    if (isInitialized) {
      localStorage.setItem('sidebar-visible', isDesktopVisible);

      if (isDesktopVisible) {
        document.documentElement.classList.remove('sidebar-hidden');
      } else {
        document.documentElement.classList.add('sidebar-hidden');
      }
    }
  }, [isDesktopVisible, isInitialized]);

  // Close sidebar & RESET SCROLL on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Sidebar Toggle Shortcut (Shift + S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for active inputs to avoid triggering while typing
      const tagName = document.activeElement.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || document.activeElement.isContentEditable;

      if (isInput) return;

      if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsDesktopVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isSidebarOpen]);

  // Dynamic Title Logic
  const getPageTitle = (path) => {
    if (path.includes('/admin/system-overview')) return 'System Overview';
    if (path.includes('/admin/user-management')) return 'User Management';
    if (path.includes('/admin/all-orders')) return 'All Orders';
    if (path.includes('/admin/export-data')) return 'Export Data';

    if (path.includes('/user/overview')) return 'Overview';
    if (path.includes('/user/new-order')) return 'New Order';
    if (path.includes('/user/my-orders')) return 'My Orders';

    // Default Fallbacks
    if (path.includes('/admin')) return 'Admin Dashboard';
    if (path.includes('/user')) return 'My Wallets';
    return 'Dashboard';
  };

  const currentTitle = getPageTitle(pathname);

  // Wide mode detection for tables
  const isWide = pathname.includes('all-orders') || pathname.includes('my-orders');
  const containerClass = `dashboard-inner-container ${isWide ? 'wide-mode' : ''}`;

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Injected Sidebar Component */}
      <SidebarComponent
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDesktopVisible={isDesktopVisible}
      />

      {/* Main Content Area */}
      <main
        className={`main-content ${!isDesktopVisible ? 'full-width' : ''}`}
        ref={mainContentRef}
        key={location.pathname}
      >
        <header className="header-surface">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              ☰
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{currentTitle}</h2>
          </div>

          {/* Portal Target for Page Actions */}
          <div id="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}></div>
        </header>

        <div className={containerClass}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
