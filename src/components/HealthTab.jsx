import { useState, useEffect, useCallback, useMemo } from 'react';
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

    // Grouping logic for the Fleet Overview
    const fleetStatus = useMemo(() => {
        const latestPerDevice = new Map();
        // Since logs are sorted desc by timestamp, the first we see per ID is the latest
        healthLogs.forEach(log => {
            if (!latestPerDevice.has(log.device_id)) {
                latestPerDevice.set(log.device_id, log);
            }
        });
        return Array.from(latestPerDevice.values());
    }, [healthLogs]);

    if (loading) {
        return (
            <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                <div className="forward-pulse" style={{ margin: '0 auto 20px' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Analyzing fleet diagnostics...</p>
            </div>
        );
    }

    if (error) return <div className="card error-banner">{error}</div>;

    return (
        <div className="health-tab">
            <div className="health-tab-header">
                <div>
                    <h2 className="health-tab-title">
                        {selectedDevice ? `Status: ${selectedDevice}` : 'Fleet Health Overview'}
                    </h2>
                    <p className="health-tab-subtitle">
                        {selectedDevice 
                            ? `Showing diagnostic history for node ${selectedDevice.slice(-4)}`
                            : `Monitoring ${fleetStatus.length} active sensor nodes across Nairobi`}
                    </p>
                </div>
                <a href={getHealthExportUrl(selectedDevice)} className="btn-export">
                    <span>Export Diagnostics</span>
                </a>
            </div>

            {selectedDevice ? (
                /* ── PER-SENSOR DEEP DIVE ─────────────────────────── */
                <div className="health-deep-dive">
                    {healthLogs[0] && (
                        <div className="card health-master-card">
                            <div className="health-id-row">
                                <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-3)' }}>Current Diagnostics</h3>
                                <span className={`status-badge ${healthLogs[0].issues?.length === 0 ? 'active' : 'inactive'}`}>
                                    {healthLogs[0].issues?.length === 0 ? 'Healthy' : 'Issues Detected'}
                                </span>
                            </div>

                            <div className="health-summary-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '20px' }}>
                                <div className="summary-metric">
                                    ⏱️ <span>{healthLogs[0].uptime_minutes}m Uptime</span>
                                </div>
                                <div className="summary-metric">
                                    📶 <span>{healthLogs[0].signal_dbm} dBm</span>
                                </div>
                                <div className="summary-metric">
                                    🔄 <span>{healthLogs[0].gsm_reconnects} Reconnects</span>
                                </div>
                                <div className="summary-metric">
                                    ⚠️ <span>{healthLogs[0].failed_requests} Failed Req.</span>
                                </div>
                            </div>

                            <div className="health-sensors" style={{ marginTop: '20px' }}>
                                <span className="health-section-title">Hardware Status</span>
                                <div className="health-pill-group">
                                    {Object.entries(healthLogs[0].sensors || {}).map(([name, status]) => (
                                        <span key={name} className={`status-pill ${status === 'OK' || status === true ? 'ok' : 'fail'}`}>
                                            {name}: {status === 'OK' || status === true ? 'OK' : 'FAIL'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
                        <table className="health-history-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Uptime</th>
                                    <th>Network</th>
                                    <th>Hardware</th>
                                    <th>Last HTTP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthLogs.slice(0, 15).map(log => (
                                    <tr key={log.id}>
                                        <td style={{ color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                                        <td>{log.uptime_minutes}m</td>
                                        <td>{log.signal_dbm} dBm</td>
                                        <td>
                                            <div className="health-pill-group">
                                                {Object.entries(log.sensors || {}).slice(0, 3).map(([n, s]) => (
                                                    <div 
                                                        key={n} 
                                                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: (s === 'OK' || s === true) ? 'var(--aqi-good)' : 'var(--aqi-unhealthy)' }}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td>{log.last_http_status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── FLEET OVERVIEW GRID ──────────────────────────── */
                <div className="health-grid-layout">
                    {fleetStatus.map(log => {
                        const issues = log.issues?.length || 0;
                        return (
                            <div key={log.device_id} className={`card health-card concise ${issues > 0 ? 'health-card--critical' : 'health-card--healthy'}`}>
                                <div className="health-id-row">
                                    <span className="health-device-id" style={{ fontSize: '0.9rem' }}>{log.device_id}</span>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: issues === 0 ? 'var(--aqi-good)' : 'var(--aqi-unhealthy)' }} />
                                </div>
                                
                                <div className="health-summary-metrics">
                                    <div className="summary-metric">
                                        📶 <span>{log.signal_dbm || '--'} dBm</span>
                                    </div>
                                    <div className="summary-metric">
                                        ⏱️ <span>{log.uptime_minutes || 0}m</span>
                                    </div>
                                </div>

                                <div className="health-pill-group">
                                    {Object.entries(log.sensors || {}).map(([name, status]) => (
                                        <span key={name} className={`status-pill ${status === 'OK' || status === true ? 'ok' : 'fail'}`}>
                                            {name}
                                        </span>
                                    ))}
                                </div>

                                {issues > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--aqi-unhealthy)', marginTop: '4px', fontWeight: 'bold' }}>
                                        ⚠️ {issues} Diagnostic Issue{issues !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
