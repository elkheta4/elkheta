'use client';
import React from 'react';
import './SystemOverview.css';

const SystemOverview = () => {
    return (
        <div id="view-system-overview" className="view-section">

            {/* Title handled by Layout */}
            <div className="text-sub" style={{ marginBottom: '2rem' }}>
                Monitor your application status and metrics.
            </div>
            
            <div className="dashboard-grid">
                <div className="stat-card">
                    <span className="stat-label">Operational Status</span>
                    <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.25rem' }}>Active</div>
                    <span className="stat-label">All systems normal</span>
                </div>
                
                <div className="stat-card">
                    <span className="stat-label">Total Users</span>
                    <div className="stat-value">--</div>
                    <span className="stat-label">Registered Agents</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Pending Orders</span>
                    <div className="stat-value">--</div>
                    <span className="stat-label">Needs attention</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Total Revenue</span>
                    <div className="stat-value">--</div>
                    <span className="stat-label">This Month</span>
                </div>
            </div>

            <div className="health-grid">
                <div className="card">
                    <h3>Server Health</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>CPU Usage</span>
                            <span style={{ color: 'var(--success)' }}>12%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-body)', borderRadius: '4px' }}>
                            <div style={{ width: '12%', height: '100%', background: 'var(--success)', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3>Database Status</h3>
                    <div style={{ marginTop: '1rem' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Connections</span>
                            <span>45/100</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Latency</span>
                            <span style={{ color: 'var(--success)' }}>14ms</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Recent System Activity</h3>
                <div className="log-list">
                    <div className="log-item">System backup completed successfully.</div>
                    <div className="log-item">New agent "Sarah" registered.</div>
                    <div className="log-item">Export data generated for November.</div>
                    <div className="log-item">System maintenance scheduled for Sunday 2 AM.</div>
                </div>
            </div>
        </div>
    );
};

export default SystemOverview;

