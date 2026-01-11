'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import { PieChart, PlusCircle, Package, LogOut, User, Wallet } from 'lucide-react';
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
                        <User size={20} />
                    </div>
                </div>
                <div className="user-profile-info">
                    <div className="user-info-text">
                        <h3 id="agent-name-display">{user?.agentName || 'Agent'}</h3>
                        <span className="user-role-badge sales">Sales Agent</span>
                    </div>
                </div>
            </div>

            <ul className="nav-list">
                <li className="nav-item">
                    <Link
                        href="/user/overview"
                        className={isActive('/user/overview') ? "nav-link active" : "nav-link"}
                        onClick={handleNavClick}
                    >
                        <PieChart size={20} />
                        <span>Overview</span>
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        href="/user/new-order"
                        className={isActive('/user/new-order') ? "nav-link active" : "nav-link"}
                        onClick={handleNavClick}
                    >
                        <PlusCircle size={20} />
                        <span>New Order</span>
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        href="/user/my-orders"
                        className={isActive('/user/my-orders') ? "nav-link active" : "nav-link"}
                        onClick={handleNavClick}
                    >
                        <Package size={20} />
                        <span>My Orders</span>
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        href="/user/wallets"
                        className={isActive('/user/wallets') ? "nav-link active" : "nav-link"}
                        onClick={handleNavClick}
                    >
                        <Wallet size={20} />
                        <span>My Wallets</span>
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
