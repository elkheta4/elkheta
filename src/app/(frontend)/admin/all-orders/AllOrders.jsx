
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Store from '@/services/store';
import Console from '@/utils/console';
import { APP_SETTINGS } from '@/utils/constants';
import Pagination from '@/components/common/Pagination';
import CopyableText from '@/components/common/CopyableText';
import PhoneCell from '@/components/common/PhoneCell';
import { Loader2, Inbox, RefreshCw, User, Activity, Trash, Image } from 'lucide-react';
import Link from 'next/link';
import DateFilterDropdown from '@/components/common/DateFilterDropdown';
import GenericFilterDropdown from '@/components/common/GenericFilterDropdown';
import HeaderActions from '@/components/common/HeaderActions';
import './AllOrders.css';
import './AllOrders.css';

const AllOrders = () => {
    // Helper to format date for display (DD MMM YYYY)
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAgent, setFilterAgent] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDates, setFilterDates] = useState([]); // Array

    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = APP_SETTINGS.pagination.adminOrdersPageSize;

    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // Derived Lists for Dropdowns
    const [uniqueAgents, setUniqueAgents] = useState([]);
    const [uniqueStatuses, setUniqueStatuses] = useState([]);

    // uniqueDates will now be derived from context, though we might still want global stats. 
    // For now, removing static dates to rely on dynamic ones.
    // const [uniqueDates, setUniqueDates] = useState([]);

    const fetchOrders = async (force = false) => {
        if (orders.length === 0) setLoading(true);
        if (force) setIsRefreshing(true);

        setError(null);

        try {
            // forceRefresh tells the SERVER to bypass its cache (critical for Vercel)
            const res = await Store.fetch('allSales', 'getSales', { agentName: 'Admin', showAll: true, forceRefresh: force }, { ttl: APP_SETTINGS.cache.ordersTTL, force, storage: 'local' });
            if (res.success) {
                Console.component.data('AllOrders', res.sales.length, 'orders');
                setOrders(res.sales);
                setLastUpdated(res.timestamp ? new Date(res.timestamp) : new Date());
                if (res.spreadsheetId) setSpreadsheetId(res.spreadsheetId);

                // Extract Unique Options
                const agents = [...new Set(res.sales.map(s => s.agentName).filter(Boolean))].sort();
                // Only keep specific status options: Overpayment + smart Without Data
                const allStatuses = ['Overpayment', 'Without Data'];

                // Extract Unique Dates (YYYY-MM-DD) from either activationDate or timestamp
                const dateSet = new Set();
                res.sales.forEach(s => {
                    const d1 = s.activationDate ? s.activationDate.split('T')[0] : null;
                    const d2 = s.timestamp ? s.timestamp.split('T')[0] : null; // Handle if timestamp includes time
                    if (d1 && d1.match(/^\d{4}-\d{2}-\d{2}$/)) dateSet.add(d1);
                    // Also check timestamp format if needed, usually timestamp is ISO
                    if (s.timestamp) {
                        try {
                            const dateOnly = new Date(s.timestamp).toISOString().split('T')[0];
                            dateSet.add(dateOnly);
                        } catch (e) { }
                    }
                });
                const dates = [...dateSet].sort().reverse(); // Newest first

                setUniqueAgents(agents);
                setUniqueStatuses(allStatuses);

                // setUniqueDates(dates);  <-- Moved to dynamic derivation

            } else {
                setError(res.message || 'Failed to fetch orders.');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        // Initial load: Use localStorage cache if available (no forceRefresh)
        // This prevents rate limiting on page navigation
        fetchOrders(false);

        // Background poll every hour (with forceRefresh to get fresh data)
        const poller = setInterval(() => {
            fetchOrders(true);
        }, 60 * 60 * 1000);
        return () => clearInterval(poller);
    }, []);

    // Advanced Filtering Logic
    // --- Advanced Filtering Logic (Context Aware) ---

    // 1. Base Filter (Search + Agent + Status) -> Generates Context for Dates
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

            // 2. Agent Filter
            if (filterAgent && o.agentName !== filterAgent) return false;

            // 3. Status Filter (Without Data smart + Overpayment)
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
    }, [orders, searchQuery, filterAgent, filterStatus]);

    // 2. Derive Available Dates from Base Filter
    const contextAwareDates = useMemo(() => {
        const dateSet = new Set();
        baseFilteredOrders.forEach(s => {
            // Strictly use Activation Date
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

    // Calucalate Stats from Filtered View
    const totalOrders = finalFilteredOrders.length;
    const totalCost = finalFilteredOrders.reduce((sum, o) => sum + (Number(o.orderCost) || 0), 0);

    return (
        <div id="view-all-orders" className="view-section">
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
                            id="searchAllOrders"
                            placeholder="Search by Name, Code, Phone, Transfer..."
                            className="search-input"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                        <button onClick={() => fetchOrders(true)} className="orders-refresh-btn" disabled={loading || isRefreshing} title="Refresh Orders" style={{ marginLeft: '0.5rem' }}>
                            <RefreshCw size={18} className={isRefreshing ? "spinner-spin" : ""} />
                        </button>

                        {lastUpdated && <span className="last-updated-text" style={{ marginLeft: '1rem' }}>Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                </div>

                {/* Row 2: Advanced Filters */}
                <div className="controls-secondary">
                    <div style={{ width: '200px' }}>
                        <GenericFilterDropdown
                            value={filterAgent}
                            onChange={(val) => { setFilterAgent(val); setCurrentPage(1); }}
                            options={uniqueAgents}
                            placeholder="All Agents"
                            icon={User}
                        />
                    </div>

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
                    {/* Reset Filters - Optional helper */}
                    {(filterAgent || filterStatus || filterDates.length > 0) && (
                        <button
                            className="reset-filters-btn"
                            onClick={() => {
                                setFilterAgent('');
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
                            <th>Agent Name</th>
                        </tr>
                    </thead>
                    <tbody id="all-orders-body">
                        {loading && orders.length === 0 ? (
                            <tr><td colSpan="25" className="ao-state-cell">
                                <div className="state-content">
                                    <Loader2 className="state-icon spinner-spin" size={40} />
                                    <p>Loading all orders...</p>
                                </div>
                            </td></tr>
                        ) : error ? (
                            <tr><td colSpan="25" className="ao-state-cell">
                                <div className="state-content error">
                                    <p>Error: {error}</p>
                                </div>
                            </td></tr>
                        ) : currentOrders.length === 0 ? (
                            <tr><td colSpan="25" className="ao-state-cell">
                                <div className="state-content">
                                    <Inbox className="state-icon" size={40} />
                                    <p>No orders found</p>
                                </div>
                            </td></tr>
                        ) : (
                            currentOrders.map((o, idx) => (
                                <tr key={idx}>
                                    <td className="col-idx-cell">
                                        <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${o.sheetId}&range=${o.row}:${o.row}`} target="_blank" className="row-link">
                                            {o.row}
                                        </a>
                                    </td>
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
                                    <td className="col-agent-cell">
                                        <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${o.sheetId}`} target="_blank" className="agent-link">
                                            {o.agentName || 'Unknown'}
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Proof Modal */}
        </div>
    );
};

export default AllOrders;

