import React, { useState, useEffect, useCallback } from 'react';
import { api, DriftCheck, Model } from '../services/api';
import { formatEST } from '../utils/timeUtils';
import '../App.css';

// Helper function to check if drift was detected
const isDriftDetected = (check: DriftCheck): boolean => {
  if (typeof check.drift_detected === 'boolean') return check.drift_detected;
  const v = check.drift_detected.toString().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1';
};

const DriftChecks: React.FC = () => {
  const [checks, setChecks] = useState<DriftCheck[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/api/models');
      setModels(res.data);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChecks = useCallback(async () => {
    try {
      if (filterModel === 'all') {
        // Load all checks by iterating through models
        if (models.length === 0) {
          setChecks([]);
          return;
        }
        const allChecks: DriftCheck[] = [];
        // Try new unified endpoint first
        try {
          const res = await api.get('/api/drift-checks?limit=100');
          allChecks.push(...res.data);
        } catch (e) {
          // Fallback to old endpoint per model
          for (const model of models) {
            try {
              const res = await api.get(`/api/drift/checks/${model.id}`);
              allChecks.push(...res.data);
            } catch (error) {
              console.error(`Error loading checks for model ${model.id}:`, error);
            }
          }
        }
        setChecks(allChecks.sort((a, b) => 
          new Date(b.check_timestamp).getTime() - new Date(a.check_timestamp).getTime()
        ));
      } else {
        // Try new endpoint first, fallback to old endpoint
        let res;
        try {
          res = await api.get(`/api/drift-checks?model_id=${filterModel}&limit=100`);
        } catch (e) {
          // Fallback to old endpoint
          res = await api.get(`/api/drift/checks/${filterModel}`);
        }
        setChecks(res.data);
      }
    } catch (error) {
      console.error('Error loading drift checks:', error);
      setChecks([]);
    }
  }, [filterModel, models]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (models.length > 0 || filterModel !== 'all') {
      loadChecks();
    }
  }, [filterModel, models, loadChecks]);

  // Listen for data updates and drift checks
  useEffect(() => {
    const handleDataUpdate = () => {
      loadData();
      if (models.length > 0 || filterModel !== 'all') {
        loadChecks();
      }
    };

    const handleDriftCheck = () => {
      // Auto-refresh when drift check completes
      loadData();
      if (models.length > 0 || filterModel !== 'all') {
        loadChecks();
      }
    };

    window.addEventListener('dataUpdated', handleDataUpdate);
    window.addEventListener('driftCheckCompleted', handleDriftCheck);
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
      window.removeEventListener('driftCheckCompleted', handleDriftCheck);
    };
  }, [filterModel, models, loadChecks, loadData]);

  // Auto-refresh every 30 seconds (like a real monitoring system)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
      loadChecks();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loadChecks, loadData]);


  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  if (loading) {
    return <div className="loading">Loading drift checks...</div>;
  }

  const driftDetectedCount = checks.filter(isDriftDetected).length;
  const totalChecks = checks.length;

  return (
    <div>
      <div style={{ 
        marginBottom: '2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Drift Checks
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
            View drift detection history and analyze model performance over time
          </p>
        </div>
        {totalChecks > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              padding: '0.75rem 1.25rem', 
              background: 'white', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--gray-200)',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                Total Checks
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)' }}>
                {totalChecks}
              </div>
            </div>
            <div style={{ 
              padding: '0.75rem 1.25rem', 
              background: driftDetectedCount > 0 ? 'var(--danger-50)' : 'var(--success-50)', 
              borderRadius: 'var(--radius-md)', 
              border: `1px solid ${driftDetectedCount > 0 ? 'var(--danger)' : 'var(--success)'}`,
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8125rem', color: driftDetectedCount > 0 ? 'var(--danger)' : 'var(--success)', marginBottom: '0.25rem', fontWeight: '600' }}>
                Drift Detected
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: driftDetectedCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {driftDetectedCount}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Filter by Model</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
          Select a model to view its drift check history, or view all checks
        </p>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          style={{ maxWidth: '400px' }}
        >
          <option value="all">All Models</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.source_system})
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h2 className="card-title">Drift Check History</h2>
        {checks.length === 0 ? (
          <div className="empty-state">
            <p>No drift checks found. Run a drift check from the Models page to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Model</th>
                  <th>Drift Detected</th>
                  <th>Value Type</th>
                  <th>R²</th>
                  <th>RMSE</th>
                  <th>MAE</th>
                  <th>PSI</th>
                  <th>KS Statistic</th>
                </tr>
              </thead>
              <tbody>
                {checks.map(check => (
                  <tr key={check.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatEST(check.check_timestamp)}
                    </td>
                    <td><strong>{getModelName(check.model_id)}</strong></td>
                    <td>
                      <span className={`badge ${isDriftDetected(check) ? 'badge-danger' : 'badge-success'}`}>
                        {isDriftDetected(check) ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>
                      {check.details?.value_type || 'IC50'} ({check.details?.units || 'μM'})
                    </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {(() => {
                            const r2 = check.r_squared ?? check.details?.r_squared;
                            return r2 !== null && r2 !== undefined ? r2.toFixed(3) : 'N/A';
                          })()}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {(() => {
                            const rmse = check.rmse ?? check.details?.rmse;
                            return rmse !== null && rmse !== undefined && rmse > 0 ? rmse.toFixed(3) : 'N/A';
                          })()} {check.details?.units || 'μM'}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {(() => {
                            const mae = check.mae ?? check.details?.mae;
                            return mae !== null && mae !== undefined && mae > 0 ? mae.toFixed(3) : 'N/A';
                          })()} {check.details?.units || 'μM'}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {(() => {
                            const psi = check.psi_value ?? check.psi ?? check.details?.psi;
                            return psi !== null && psi !== undefined && psi > 0 ? psi.toFixed(3) : 'N/A';
                          })()}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {(() => {
                            const ks = check.ks_statistic ?? check.ks_stat ?? check.details?.ks_stat;
                            return ks !== null && ks !== undefined && ks > 0 ? ks.toFixed(3) : 'N/A';
                          })()}
                        </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriftChecks;

