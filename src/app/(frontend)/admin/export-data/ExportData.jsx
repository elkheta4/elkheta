'use client';
import React, { useState, useEffect } from 'react';
import Store from '@/services/store';
import { callGasApi } from '@/services/api';
import { APP_SETTINGS } from '@/utils/constants';
import DatePicker from '@/components/common/DatePicker';
import GenericFilterDropdown from '@/components/common/GenericFilterDropdown';
import { User } from 'lucide-react';
import './ExportData.css';

const ExportData = () => {
    const [agents, setAgents] = useState([]);
    const [status, setStatus] = useState('');
    const [statusColor, setStatusColor] = useState('inherit');

    // Form
    const [selectedAgent, setSelectedAgent] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Fetch agents from actual orders data (same cache as All Orders page)
        Store.fetch('allSales', 'getSales', { agentName: 'Admin', showAll: true }, { storage: 'local', ttl: APP_SETTINGS.cache.ordersTTL }).then(res => {
            if (res.success && res.sales) {
                // Extract unique agent names from actual order data
                const agentNames = [...new Set(res.sales.map(s => s.agentName).filter(Boolean))].sort();
                setAgents(agentNames);
            }
        });
    }, []);

    const triggerExport = async (format) => {
        if (startDate && endDate) {
            if (new Date(startDate) > new Date(endDate)) {
                setStatus('Error: Start Date cannot be after End Date');
                setStatusColor('#dc3545');
                return;
            }
        }

        setStatus('Fetching data...');
        setStatusColor('inherit');

        try {
            const payload = {
                agentName: selectedAgent,
                startDate: startDate || null,
                endDate: endDate || null
            };

            const res = await callGasApi('exportData', payload);

            if (res.success) {
                if (!res.rows || res.rows.length === 0) {
                    setStatus('No data found for the selected option/range.');
                    setStatusColor('#dc3545');
                    return;
                }

                setStatus('Generating file...');
                // const XLSX = await import('xlsx'); // DISABLED FOR BUILD
                const dateStr = new Date().toLocaleDateString('en-CA');
                const safeAgent = selectedAgent.replace(/[^a-z0-9]/gi, '_');
                const fileName = `Sales_Export_${safeAgent}_${startDate ? startDate + '_to_' + endDate : dateStr}.${format}`;



                if (format === 'xlsx') {
                    // ExcelJS Export (Local Vendor Script)
                    if (!window.ExcelJS) {
                        setStatus('Loading Excel engine...');
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = '/scripts/exceljs.min.js'; // Local public file
                            script.onload = resolve;
                            script.onerror = () => reject(new Error('Failed to load ExcelJS'));
                            document.body.appendChild(script);
                        });
                    }

                    const workbook = new window.ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Exported Data');

                    // Add Headers
                    worksheet.addRow(res.headers);

                    // Add Data
                    res.rows.forEach(row => {
                        worksheet.addRow(row);
                    });

                    // Style Headers
                    worksheet.getRow(1).font = { bold: true };

                    // Generate Buffer
                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                } else {
                    // Manual CSV Generation
                    const csvContent = [
                        res.headers.join(","),
                        ...res.rows.map(row => row.map(item => `"${item}"`).join(","))
                    ].join("\n");

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", fileName.replace('.xlsx', '.csv'));
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                setStatus('Download started!');
                setStatusColor('#28a745');
                setTimeout(() => setStatus(''), 3000);
            } else {
                setStatus('Error: ' + res.error);
                setStatusColor('#dc3545');
            }
        } catch (err) {
            setStatus('Network Error');
            setStatusColor('#dc3545');
        }
    };

    return (
        <div id="view-export-data" className="view-section">
            <div className="card export-card">
                <div className="card-header">
                    <h3>Export Sales Data</h3>
                    <p className="card-subtitle">Select your preferences to generate a report.</p>
                </div>

                {/* 1. Agent Selection */}
                <div className="export-form-group">
                    <label className="input-label">Select Agent / Source</label>
                    <div className="select-wrapper">
                        <GenericFilterDropdown
                            value={selectedAgent}
                            onChange={setSelectedAgent}
                            options={['All', ...agents]}
                            placeholder="Select Agent"
                            icon={User}
                        />
                    </div>
                </div>

                {/* 2. Date Filter (Optional) */}
                <div className="export-filter-box">
                    <div className="filter-header">
                        <span className="filter-icon">📅</span>
                        <h4>Filter by Date (Optional)</h4>
                    </div>
                    <div className="date-grid">
                        <div className="date-input-group">
                            <DatePicker
                                label="Start Date"
                                id="startDate"
                                name="startDate"
                                value={startDate}
                                onChange={setStartDate}
                            />
                        </div>
                        <div className="date-input-group">
                            <DatePicker
                                label="End Date"
                                id="endDate"
                                name="endDate"
                                value={endDate}
                                onChange={setEndDate}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Export Actions */}
                <div className="export-actions">
                    <button onClick={() => triggerExport('xlsx')} className="export-tile excel-tile">
                        <div className="tile-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="8" y1="13" x2="16" y2="21"></line>
                                <line x1="16" y1="13" x2="8" y2="21"></line>
                            </svg>
                        </div>
                        <div className="tile-info">
                            <span className="tile-title">Excel Report</span>
                            <span className="tile-desc">.xlsx format</span>
                        </div>
                    </button>

                    <button onClick={() => triggerExport('csv')} className="export-tile csv-tile">
                        <div className="tile-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <path d="M10 12h-1v5h1"></path>
                                <path d="M14 17v-1.5a2.5 2.5 0 0 0-5 0V17"></path>
                            </svg>
                        </div>
                        <div className="tile-info">
                            <span className="tile-title">CSV Export</span>
                            <span className="tile-desc">.csv format</span>
                        </div>
                    </button>
                </div>

                {/* Status Message */}
                <div id="export-status" className={`export-status ${status ? 'active' : ''}`} style={{ color: statusColor }}>
                    {status === 'Fetching data...' ?
                        <div className="status-loading">
                            <div className="spinner-sm"></div>
                            <span>Processing Request...</span>
                        </div>
                        : status}
                </div>
            </div>
        </div>
    );
};

export default ExportData;

