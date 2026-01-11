'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { LayoutDashboard, Users, ShoppingBag, FileSpreadsheet, LogOut, Shield } from 'lucide-react';
import '../common/Sidebar.css'; // Shared CSS
const logo = '/images/logo.webp';

const Sidebar = ({ isOpen, onClose, isDesktopVisible = true }) => {
  const { user, logout } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Complete logout - clears ALL caches and state
    logout();
    // SPA navigation to login (no page reload)
    router.replace('/');
  };

  // Don't render if user is null
  if (!user) return null;

  // Helper to close on mobile when clicked
  const handleNavClick = () => {
    if (window.innerWidth <= 1024 && onClose) {
      onClose();
    }
  };

  const isActive = (path) => pathname === path;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isDesktopVisible ? 'desktop-hidden' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-icon">
          <img src={logo} alt="ElKheta" className="sidebar-logo-img" />
        </div>
      </div>

      <div className="user-profile">
        <div className="user-avatar-wrapper">
          <div className="user-avatar">
            <Shield size={20} />
          </div>
        </div>
        <div className="user-profile-info">
          <div className="user-info-text">
            <h3 id="admin-agent-name">{user?.agentName || 'Admin'}</h3>
            <span className={`user-role-badge ${user?.role?.toLowerCase() || 'admin'}`}>{user?.role || 'Administrator'}</span>
          </div>
        </div>
      </div>

      <ul className="nav-list">
        <li className="nav-item">
          <Link
            href="/admin/system-overview"
            className={isActive('/admin/system-overview') ? "nav-link active" : "nav-link"}
            onClick={handleNavClick}
          >
            <LayoutDashboard size={20} />
            System Overview
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/admin/user-management"
            className={isActive('/admin/user-management') ? "nav-link active" : "nav-link"}
            onClick={handleNavClick}
          >
            <Users size={20} />
            User Management
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/admin/all-orders"
            className={isActive('/admin/all-orders') ? "nav-link active" : "nav-link"}
            onClick={handleNavClick}
          >
            <ShoppingBag size={20} />
            All Orders
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/admin/export-data"
            className={isActive('/admin/export-data') ? "nav-link active" : "nav-link"}
            onClick={handleNavClick}
          >
            <FileSpreadsheet size={20} />
            Export Data
          </Link>
        </li>
      </ul>

      <div className="logout-container">
        <button className="logout-btn" onClick={handleLogout}><LogOut size={18} /> Log Out</button>
      </div>
    </aside>
  );
};

export default Sidebar;
