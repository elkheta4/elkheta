'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import Store from '@/services/store';
import Console from '@/utils/console';
import { APP_SETTINGS } from '@/utils/constants';
import { Loader2, DollarSign, ShoppingCart, BarChart3, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import DateFilterDropdown from '@/components/common/DateFilterDropdown';
import PhoneCell from '@/components/common/PhoneCell';
import './UserOverview.css';

const UserOverview = () => {
  const { user } = useAppContext();
  const agentName = user?.agentName;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeFilter, setTimeFilter] = useState('today'); // today, month, all
  const [filterDates, setFilterDates] = useState([]); // Custom date filter

  // Fetch orders
  const fetchData = async (force = false) => {
    if (!agentName) return;
    
    if (orders.length === 0) setLoading(true);
    if (force) setIsRefreshing(true);

    try {
      const cacheKey = `mySales_${agentName}`;
      const res = await Store.fetch(cacheKey, 'getSales', { agentName }, { ttl: APP_SETTINGS.cache.ordersTTL, force, storage: 'local' });
      if (res.success) {
        Console.component.data('UserOverview', res.sales.length, 'orders');
        setOrders(res.sales);
        setLastUpdated(res.timestamp ? new Date(res.timestamp) : new Date());
      }
    } catch (err) {
      Console.component.error('UserOverview', 'Failed to load data', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [agentName]);

  // Date helpers
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    // Get local today YYYY-MM-DD
    const now = new Date();
    const today = now.toLocaleDateString('en-CA'); 
    const orderDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return orderDate === today;
  };

  const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    // Parse manually to avoid UTC shift
    const [y, m] = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr).split('-').map(Number);
    const now = new Date();
    return (m - 1) === now.getMonth() && y === now.getFullYear();
  };

  // Available dates for date filter dropdown
  const availableDates = useMemo(() => {
    const dateSet = new Set();
    orders.forEach(o => {
      const dateStr = o.activationDate;
      if (!dateStr) return;
      const extracted = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      if (extracted && extracted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateSet.add(extracted);
      }
    });
    return [...dateSet].sort().reverse();
  }, [orders]);

  // Filtered orders based on time
  const filteredOrders = useMemo(() => {
    // If custom date filter is set, use that exclusively
    if (filterDates.length > 0) {
      return orders.filter(o => {
        const dateStr = o.activationDate;
        if (!dateStr) return false;
        const orderDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        return filterDates.includes(orderDate);
      });
    }
    
    // Otherwise apply preset filter
    if (timeFilter === 'today') return orders.filter(o => isToday(o.activationDate));
    if (timeFilter === 'month') return orders.filter(o => isThisMonth(o.activationDate));
    
    // 'all' or empty = return all orders
    return orders;
  }, [orders, timeFilter, filterDates]);

  // === ANALYTICS CALCULATIONS ===
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.orderCost) || 0), 0);
    const avgValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    return {
      totalOrders,
      totalRevenue,
      avgValue
    };
  }, [filteredOrders]);

  // Recent orders (last 5 - ALWAYS GLOBAL, NOT FILTERED)
  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => { // Use 'orders' here, not 'filteredOrders'
      const dateA = new Date(a.timestamp || a.activationDate);
      const dateB = new Date(b.timestamp || b.activationDate);
      return dateB - dateA;
    }).slice(0, 5);
  }, [orders]);

  if (loading) {
    return (
      <div id="view-overview" className="view-section">
        <div className="uo-loading">
          <Loader2 className="spinner-spin" size={40} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="view-overview" className="view-section">
      {/* Header */}
      <div className="uo-header">
        <div>
          <h2 className="uo-title">Welcome, <span className="uo-name">{agentName || 'Agent'}</span></h2>
          <p className="uo-subtitle">Your sales performance dashboard</p>
        </div>
        <div className="uo-header-actions">
          <button 
            onClick={() => fetchData(true)} 
            className="uo-refresh-btn" 
            disabled={loading || isRefreshing}
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isRefreshing ? "spinner-spin" : ""} />
          </button>
          {lastUpdated && (
            <span className="uo-updated-text">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Time Filter */}
      <div className="uo-time-filter">
        {['today', 'month', 'all'].map(f => (
          <button
            key={f}
            className={`uo-filter-btn ${timeFilter === f && filterDates.length === 0 ? 'active' : ''}`}
            onClick={() => { setTimeFilter(f); setFilterDates([]); }}
          >
            {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : 'This Month'}
          </button>
        ))}
        
        <div className={`uo-date-filter ${filterDates.length > 0 ? 'uo-date-filter--active' : ''}`}>
          <DateFilterDropdown
            placeholder="Filter by Date(s)"
            value={filterDates}
            onChange={(val) => { 
              setFilterDates(val); 
              if (val.length > 0) {
                setTimeFilter(''); 
              } else {
                setTimeFilter('today');
              }
            }}
            dates={availableDates}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="uo-stats-grid">
        <div className="uo-stat-card">
          <div className="uo-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="uo-stat-info">
            <span className="uo-stat-label">Total Orders</span>
            <span className="uo-stat-value">{stats.totalOrders}</span>
          </div>
        </div>

        <div className="uo-stat-card">
          <div className="uo-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
            <DollarSign size={24} />
          </div>
          <div className="uo-stat-info">
            <span className="uo-stat-label">Total Revenue</span>
            <span className="uo-stat-value">{stats.totalRevenue.toLocaleString()} EGP</span>
          </div>
        </div>

        <div className="uo-stat-card">
          <div className="uo-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <BarChart3 size={24} />
          </div>
          <div className="uo-stat-info">
            <span className="uo-stat-label">Without Data</span>
            <span className="uo-stat-value">
              {filteredOrders.filter(o => {
                const infoDetails = (o.infoDetails || '').toLowerCase();
                const hasPhone = o.studentNumber && String(o.studentNumber).trim() !== '';
                return infoDetails.includes('without') && !hasPhone;
              }).length}
            </span>
          </div>
        </div>

        <div className="uo-stat-card">
          <div className="uo-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <TrendingUp size={24} />
          </div>
          <div className="uo-stat-info">
            <span className="uo-stat-label">Avg. Value</span>
            <span className="uo-stat-value">{stats.avgValue.toLocaleString()} EGP</span>
          </div>
        </div>
      </div>



      {/* Recent Orders */}
      <div className="uo-recent-card">
        <div className="uo-recent-header">
          <h3 className="uo-chart-title">Recent Orders</h3>
          <Link href="/user/my-orders" className="uo-view-all">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <div className="uo-recent-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Number</th>
                <th>Cost</th>
                <th>Class</th>
                <th>Package</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan="6" className="uo-empty">No orders yet</td></tr>
              ) : (
                recentOrders.map((o, idx) => (
                  <tr key={idx}>
                    <td>{o.studentName || '-'}</td>
                    <td><PhoneCell number={o.studentNumber} label="Student" /></td>
                    <td className="uo-cost">{Number(o.orderCost || 0).toLocaleString()}</td>
                    <td>{o.class || '-'}</td>
                    <td>{o.subtype || '-'}</td>
                    <td>{o.subjectName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserOverview;
