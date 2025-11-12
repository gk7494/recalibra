import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, DriftCheck } from '../services/api';

interface DriftAlert {
  id: string;
  model_id: string;
  model_name: string;
  check_timestamp: string;
  drift_detected: boolean | string;
  psi?: number;
  ks_stat?: number;
  r_squared?: number;
  rmse?: number;
  mae?: number;
  details?: any;
  status: 'detected' | 'investigating' | 'resolved';
  change_type?: string;
  change_value?: number;
}

const DriftAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadAlerts = useCallback(async () => {
    try {
      // Get all drift checks
      const checksRes = await api.get('/api/drift-checks?limit=50');
      const checks: DriftCheck[] = checksRes.data || [];
      
      // Get all models to map model_id to model name
      const modelsRes = await api.get('/api/models');
      const models = modelsRes.data || [];
      const modelMap = new Map<string, string>(models.map((m: any) => [m.id, m.name || 'Unknown Model']));
      
      // Convert drift checks to alerts
      const alertsData: DriftAlert[] = checks
        .filter(check => {
          // Only show checks where drift was detected
          const detected = check.drift_detected === true || 
                          check.drift_detected === 'YES' || 
                          check.drift_detected === 'yes';
          return detected;
        })
        .map((check, index) => {
          const details = check.details || {};
          const prevCheck = checks[index + 1]; // Get previous check for comparison
          const prevDetails = prevCheck?.details || {};
          
          // Calculate change percentages
          let changeType = 'Performance';
          let changeValue = 0;
          
          if (check.rmse && prevCheck?.rmse) {
            changeType = 'RMSE';
            changeValue = ((check.rmse - prevCheck.rmse) / prevCheck.rmse) * 100;
          } else if (check.r_squared !== undefined && prevCheck?.r_squared !== undefined) {
            changeType = 'R²';
            changeValue = ((check.r_squared - prevCheck.r_squared) / Math.abs(prevCheck.r_squared || 1)) * 100;
          } else if (check.mae && prevCheck?.mae) {
            changeType = 'MAE';
            changeValue = ((check.mae - prevCheck.mae) / prevCheck.mae) * 100;
          }
          
          // Determine status based on PSI and recency
          let status: 'detected' | 'investigating' | 'resolved' = 'detected';
          const psi = check.psi || check.details?.psi || 0;
          const daysAgo = (Date.now() - new Date(check.check_timestamp).getTime()) / (1000 * 60 * 60 * 24);
          
          if (psi > 0.25 && daysAgo < 2) {
            status = 'detected';
          } else if (psi > 0.15 && daysAgo < 7) {
            status = 'investigating';
          } else {
            status = 'resolved';
          }
          
          const modelName = modelMap.get(check.model_id);
          return {
            id: check.id,
            model_id: check.model_id,
            model_name: modelName || 'Unknown Model',
            check_timestamp: check.check_timestamp,
            drift_detected: check.drift_detected,
            psi: check.psi || details.psi,
            ks_stat: check.ks_stat || details.ks_stat,
            r_squared: check.r_squared || details.r_squared,
            rmse: check.rmse || details.rmse,
            mae: check.mae || details.mae,
            details,
            status,
            change_type: changeType,
            change_value: changeValue
          };
        })
        .sort((a, b) => new Date(b.check_timestamp).getTime() - new Date(a.check_timestamp).getTime())
        .slice(0, 10); // Show top 10 most recent
      
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading drift alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected':
        return '#dc2626'; // red
      case 'investigating':
        return '#2563eb'; // blue
      case 'resolved':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'detected':
        return '#fee2e2';
      case 'investigating':
        return '#dbeafe';
      case 'resolved':
        return '#d1fae5';
      default:
        return '#f3f4f6';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const getChangeDescription = (alert: DriftAlert) => {
    if (!alert.change_type || !alert.change_value) {
      return 'Drift detected';
    }
    
    const sign = alert.change_value > 0 ? '+' : '';
    const value = Math.abs(alert.change_value).toFixed(1);
    
    // Determine source based on details
    let source = 'Performance';
    if (alert.details?.reagent_batch) {
      source = `Reagent Batch #${alert.details.reagent_batch}`;
    } else if (alert.details?.instrument_id) {
      source = `Instrument ${alert.details.instrument_id}`;
    } else if (alert.details?.assay_version) {
      source = `Assay Version ${alert.details.assay_version}`;
    }
    
    return `• ${source} • ${alert.change_type} changed by ${sign}${value}%`;
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading">Loading drift alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--gray-900)' }}>
          Recent Drift Alerts
        </h2>
        <button
          onClick={() => navigate('/drift-checks')}
          style={{
            padding: '0.5rem 1rem',
            background: 'white',
            border: '1px solid var(--gray-300)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--gray-700)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          View All
        </button>
      </div>

      {alerts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: 'var(--gray-500)'
        }}>
          No drift alerts. All models are performing within expected ranges.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => navigate(`/models/${alert.model_id}`)}
              style={{
                padding: '1rem',
                background: 'white',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  marginBottom: '0.25rem',
                  color: 'var(--gray-900)'
                }}>
                  {alert.model_name}
                </h3>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--gray-600)',
                  margin: 0
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(alert.status),
                    marginRight: '0.5rem'
                  }}></span>
                  {getChangeDescription(alert)}
                </p>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem'
              }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: getStatusBg(alert.status),
                  color: getStatusColor(alert.status),
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {alert.status}
                </span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--gray-500)',
                  whiteSpace: 'nowrap'
                }}>
                  {formatDate(alert.check_timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriftAlerts;

