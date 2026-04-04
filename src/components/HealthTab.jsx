import { useState, useEffect, useCallback } from 'react';
import { fetchHealthData, getHealthExportUrl } from '../api/dashboard';

export default function HealthTab({ selectedDevice = '' }) {
    const [healthLogs, setHealthLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadHealth = useCallback(async () => {
        try {
            const data = await fetchHealthData(selectedDevice);
            setHealthLogs(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedDevice]);

    useEffect(() => {
        loadHealth();
        const interval = setInterval(loadHealth, 15000);
        return () => clearInterval(interval);
    }, [loadHealth]);

    if (loading) {
        return (
            <section className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading health diagnostics...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--aqi-unhealthy)' }}>Error: {error}</p>
                <button onClick={loadHealth} className="btn-export" style={{ marginTop: '12px' }}>
                    Retry
                </button>
            </section>
        );
    }

    return (
        <div className="health-tab">
            {/* Header bar with export */}
            <div className="health-tab-header">
                <div>
                    <h2 className="health-tab-title">Device Health & Diagnostics</h2>
                    <p className="health-tab-subtitle">
                        {healthLogs.length} health record{healthLogs.length !== 1 ? 's' : ''} found
                        {selectedDevice ? ` for ${selectedDevice}` : ''}
                    </p>
                </div>
                <a href={getHealthExportUrl(selectedDevice)} className="btn-export">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export CSV
                </a>
            </div>

            {healthLogs.length === 0 ? (
                <section className="card health-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '16px' }}>
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <p>No health data recorded yet. Data will appear once your sensor sends its first diagnostic report.</p>
                </section>
            ) : (
                healthLogs.slice(0, 20).map((log) => {
                    const issueCount = log.issues?.length || 0;
                    const severity = issueCount === 0 ? 'healthy' : issueCount <= 2 ? 'warning' : 'critical';

                    return (
                        <section key={log.id} className={`card health-card health-card--${severity}`}>
                            <div className="health-card-top">
                                <div>
                                    <span className="health-device-id">{log.device_id}</span>
                                    <span className="health-timestamp">{log.timestamp}</span>
                                </div>
                                <span className={`health-badge health-badge--${severity}`}>
                                    {issueCount ? `${issueCount} issue${issueCount > 1 ? 's' : ''}` : 'Healthy'}
                                </span>
                            </div>

                            {/* Metrics row */}
                            <div className="health-metrics-grid">
                                <div className="health-metric-item">
                                    <span className="health-metric-label">Uptime</span>
                                    <span className="health-metric-value">{log.uptime_minutes ?? '--'} <small>min</small></span>
                                </div>
                                <div className="health-metric-item">
                                    <span className="health-metric-label">Signal</span>
                                    <span className="health-metric-value">{log.signal_dbm ?? '--'} <small>dBm</small></span>
                                </div>
                                <div className="health-metric-item">
                                    <span className="health-metric-label">Reconnects</span>
                                    <span className="health-metric-value">{log.gsm_reconnects ?? '--'}</span>
                                </div>
                                <div className="health-metric-item">
                                    <span className="health-metric-label">Failed Req.</span>
                                    <span className="health-metric-value">{log.failed_requests ?? '--'}</span>
                                </div>
                                <div className="health-metric-item">
                                    <span className="health-metric-label">HTTP Status</span>
                                    <span className="health-metric-value">{log.last_http_status ?? '--'}</span>
                                </div>
                            </div>

                            {/* Issues */}
                            {log.issues && log.issues.length > 0 && (
                                <div className="health-issues">
                                    <span className="health-section-title">Diagnostic Issues</span>
                                    {log.issues.map((issue, i) => (
                                        <div key={i} className="health-issue-item">
                                            ⚠️ {issue}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Sensor statuses */}
                            {log.sensors && Object.keys(log.sensors).length > 0 && (
                                <div className="health-sensors">
                                    <span className="health-section-title">Sensor Hardware Status</span>
                                    <div className="health-sensor-pills">
                                        {Object.entries(log.sensors).map(([name, status]) => (
                                            <span key={name} className={`health-sensor-pill ${status === 'OK' ? 'ok' : 'fail'}`}>
                                                {name}: {status}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })
            )}
        </div>
    );
}
