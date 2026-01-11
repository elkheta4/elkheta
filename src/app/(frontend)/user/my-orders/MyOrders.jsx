
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Store from '@/services/store';
import Console from '@/utils/console';
import { APP_SETTINGS } from '@/utils/constants';
import Pagination from '@/components/common/Pagination';
import CopyableText from '@/components/common/CopyableText';
import PhoneCell from '@/components/common/PhoneCell';
import { Loader2, Inbox, AlertTriangle, RefreshCw, Activity, Trash, Image } from 'lucide-react';
import DateFilterDropdown from '@/components/common/DateFilterDropdown';
import GenericFilterDropdown from '@/components/common/GenericFilterDropdown';
import HeaderActions from '@/components/common/HeaderActions';
import './MyOrders.css';

import { useAppContext } from '@/context/AppContext';
import { useUserDashboardContext } from '@/context/UserDashboardContext';

const MyOrders = () => {
  const { user } = useAppContext();
  const agentName = user?.agentName;
  const { refreshTrigger } = useUserDashboardContext() || {};

  // Helper to format date for display (DD MMM YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!user && typeof window === 'undefined') {
    return null;
  }

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDates, setFilterDates] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = APP_SETTINGS.pagination.userOrdersPageSize;

  // Derived Lists for Dropdowns
  const [uniqueStatuses, setUniqueStatuses] = useState([]);

  const fetchSales = async (force = false) => {
    if (!agentName) return;
    if (orders.length === 0) setLoading(true);
    if (force) setIsRefreshing(true);

    try {
      const cacheKey = `mySales_${agentName}`;
      // Pass forceRefresh to the backend API as part of the payload
      const res = await Store.fetch(cacheKey, 'getSales', { agentName, forceRefresh: force }, { force, ttl: APP_SETTINGS.cache.ordersTTL, storage: 'local' });
      if (res.success) {
        Console.component.data('MyOrders', res.sales.length, 'orders');
        setOrders(res.sales);
        setLastUpdated(res.timestamp ? new Date(res.timestamp) : new Date());

        // Only keep specific status options: Overpayment + smart Without Data
        const allStatuses = ['Overpayment', 'Without Data'];
        setUniqueStatuses(allStatuses);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Network Error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales(false);
  }, [agentName, refreshTrigger]);

  // 1. Base Filter (Search + Status) -> Generates Context for Dates
  const baseFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Search Query
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        const match = (
          (o.studentName && o.studentName.toLowerCase().includes(lower)) ||
          (o.studentNumber && String(o.studentNumber).includes(lower)) ||
          (o.studentCode && String(o.studentCode).toLowerCase().includes(lower)) ||
          (o.parentNumber && String(o.parentNumber).includes(lower)) ||
          (o.transferNumber && String(o.transferNumber).includes(lower)) ||
          (o.transferCode && String(o.transferCode).toLowerCase().includes(lower))
        );
        if (!match) return false;
      }

      // 2. Status Filter (Without Data smart + Overpayment)
      if (filterStatus) {
        if (filterStatus === 'Without Data') {
          // Show only if infoDetails is "without data" AND no phone
          const infoDetails = (o.infoDetails || '').toLowerCase();
          const hasPhone = o.studentNumber && String(o.studentNumber).trim() !== '';
          if (!(infoDetails.includes('without') && !hasPhone)) return false;
        } else if (filterStatus === 'Overpayment') {
          // Show only if stateOfOrder is Overpayment
          if (o.stateOfOrder !== 'Overpayment') return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, filterStatus]);

  // 2. Derive Available Dates from Base Filter
  const contextAwareDates = useMemo(() => {
    const dateSet = new Set();
    baseFilteredOrders.forEach(s => {
      const dateStr = s.activationDate;
      if (!dateStr) return;

      let extractedDate = '';
      if (dateStr.includes('T')) {
        extractedDate = dateStr.split('T')[0];
      } else {
        extractedDate = dateStr;
      }

      if (extractedDate && extractedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateSet.add(extractedDate);
      }
    });
    return [...dateSet].sort().reverse();
  }, [baseFilteredOrders]);

  // 3. Final Filter (Base + Date)
  const finalFilteredOrders = useMemo(() => {
    if (filterDates.length === 0) return baseFilteredOrders;

    return baseFilteredOrders.filter(o => {
      const dateStr = o.activationDate;
      if (!dateStr) return false;

      let orderDateStr = '';
      if (dateStr.includes('T')) {
        orderDateStr = dateStr.split('T')[0];
      } else {
        orderDateStr = dateStr;
      }

      if (!orderDateStr || !orderDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        try {
          orderDateStr = new Date(dateStr).toISOString().split('T')[0];
        } catch (e) { }
      }

      return filterDates.includes(orderDateStr);
    });
  }, [baseFilteredOrders, filterDates]);

  // Pagination
  const totalPages = Math.ceil(finalFilteredOrders.length / PAGE_SIZE);
  const currentOrders = finalFilteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Calculate Stats from Filtered View
  const totalOrders = finalFilteredOrders.length;
  const totalCost = finalFilteredOrders.reduce((sum, o) => sum + (Number(o.orderCost) || 0), 0);

  return (
    <div id="view-my-orders" className="view-section">
      <HeaderActions>
        <div className="stats-badges" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="stat-badge" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
            Orders: <span style={{ color: 'var(--primary)' }}>{totalOrders}</span>
          </span>
          <span className="stat-badge" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
            Cost: <span style={{ color: 'var(--success)' }}>{totalCost.toLocaleString()}</span>
          </span>
        </div>
      </HeaderActions>

      <div className="controls-container">
        {/* Row 1: Search & Refresh */}
        <div className="controls-header">
          <div className="search-container">
            <input
              type="text"
              id="searchMyOrders"
              placeholder="Search by Name, Code, Phone, Transfer..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            <button onClick={() => fetchSales(true)} className="orders-refresh-btn" disabled={loading || isRefreshing} title="Refresh Orders" style={{ marginLeft: '0.5rem' }}>
              <RefreshCw size={18} className={isRefreshing ? "spinner-spin" : ""} />
            </button>

            {lastUpdated && <span className="last-updated-text" style={{ marginLeft: '1rem' }}>Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>

        {/* Row 2: Advanced Filters */}
        <div className="controls-secondary">
          <div style={{ width: '200px' }}>
            <GenericFilterDropdown
              value={filterStatus}
              onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
              options={uniqueStatuses}
              placeholder="All Statuses"
              icon={Activity}
            />
          </div>

          <div className="date-filter-group">
            <DateFilterDropdown
              placeholder="Filter by Date(s)"
              value={filterDates}
              onChange={(val) => { setFilterDates(val); setCurrentPage(1); }}
              dates={contextAwareDates}
            />
          </div>

          {/* Reset Filters */}
          {(filterStatus || filterDates.length > 0) && (
            <button
              className="reset-filters-btn"
              onClick={() => {
                setFilterStatus('');
                setFilterDates([]);
                setCurrentPage(1);
              }}
            >
              <Trash size={14} style={{ marginRight: '6px' }} />
              Reset Filters
            </button>
          )}

          <div className="pagination-wrapper">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th className="col-idx">Row</th>
              <th>Timestamp</th>
              <th>Info Details</th>
              <th>Student Code</th>
              <th>Activation Date</th>
              <th>Student Name</th>
              <th>Student Number</th>
              <th>Parent Number</th>
              <th>Birthday</th>
              <th>City</th>
              <th>Area</th>
              <th>State Of Order</th>
              <th>Subtype</th>
              <th>Class</th>
              <th>Subject Name</th>
              <th>Order Cost</th>
              <th>Note</th>
              <th>Wallet</th>
              <th>Transfer Number</th>
              <th>Transfer Code Status</th>
              <th>Transfer Code</th>
              <th>Source Of Data</th>
            </tr>
          </thead>
          <tbody id="my-orders-body">
            {loading && orders.length === 0 ? (
              <tr><td colSpan="24" className="mo-state-cell">
                <div className="state-content">
                  <Loader2 className="state-icon spinner-spin" size={40} />
                  <p>Loading your orders...</p>
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan="24" className="mo-state-cell">
                <div className="state-content error">
                  <AlertTriangle className="state-icon" size={40} />
                  <p>Error: {error}</p>
                </div>
              </td></tr>
            ) : currentOrders.length === 0 ? (
              <tr><td colSpan="24" className="mo-state-cell">
                <div className="state-content">
                  <Inbox className="state-icon" size={40} />
                  <p>No orders found</p>
                  {/* Warning if we had a silent failure but no error state was set */}
                  {/* Only show refresh hint if truly empty */}
                  <button className="text-sm text-primary underline mt-2" onClick={() => fetchSales(true)}>
                    Check Again (Refresh)
                  </button>
                </div>
              </td></tr>
            ) : (
              currentOrders.map((o, idx) => (
                <tr key={idx}>
                  <td className="col-idx-cell">{o.row}</td>
                  <td>{o.timestamp || '-'}</td>
                  <td>{o.infoDetails || '-'}</td>
                  <td>{o.studentCode || '-'}</td>
                  <td>{formatDate(o.activationDate)}</td>
                  <td>{o.studentName || '-'}</td>
                  <td>
                    <PhoneCell number={o.studentNumber} label="Student" />
                  </td>
                  <td>
                    <PhoneCell number={o.parentNumber} label="Parent" />
                  </td>
                  <td>{o.birthday || '-'}</td>
                  <td>{o.city || '-'}</td>
                  <td>{o.area || '-'}</td>
                  <td>{o.stateOfOrder || '-'}</td>
                  <td><CopyableText text={o.subtype} /></td>
                  <td><CopyableText text={o.class} /></td>
                  <td><CopyableText text={o.subjectName} /></td>
                  <td className="col-money">{Number(o.orderCost || 0).toLocaleString()}</td>
                  <td style={{ minWidth: '150px' }}><small>{o.note || ''}</small></td>
                  <td>{o.wallet || '-'}</td>
                  <td>{o.transferNumber || '-'}</td>
                  <td>{o.transferCodeStatus || '-'}</td>
                  <td>{o.transferCode || '-'}</td>
                  <td>{o.sourceOfData || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyOrders;
