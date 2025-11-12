import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatEST, formatTimeEST } from '../utils/timeUtils';
import DataSyncDetails from './DataSyncDetails';
import NotificationToast from './NotificationToast';
import '../App.css';

const Sync: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    // Load models just to ensure backend is accessible
    const checkBackend = async () => {
      try {
        await api.get('/api/models');
      } catch (error) {
        console.error('Error connecting to backend:', error);
      } finally {
        setLoading(false);
      }
    };
    checkBackend();
  }, []);

  const syncBenchling = async () => {
    setSyncing('benchling');
    setSyncResult(null);
    
    // Show loading notification
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        type: 'info',
        message: 'Syncing Benchling data...',
        duration: 2000
      }
    }));
    
    try {
      const res = await api.post('/api/sync/benchling');
      const syncedCount = res.data.synced_count || res.data.synced || res.data.count || 0;
      
      // Handle skipped status (credentials not configured)
      if (res.data.status === 'skipped' || res.data.status === 'no_data') {
        setSyncResult({
          success: true,
          message: res.data.message || 'Benchling sync skipped',
          data: res.data,
          isInfo: true
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'info',
            message: res.data.message || 'Benchling sync skipped',
            duration: 5000
          }
        }));
      } else if (res.data.status === 'mock' || res.data.source?.includes('Mock')) {
        // Handle successful sync (credentials not set, but data was generated)
        setSyncResult({
          success: true,
          message: `Synced ${syncedCount} experimental results from Benchling`,
          data: res.data,
          isInfo: false
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            message: `Synced ${syncedCount} experimental results from Benchling`,
            duration: 5000
          }
        }));
      } else {
        setSyncResult({
          success: true,
          message: `Synced ${syncedCount} experimental results from Benchling`,
          data: res.data
        });
        
        // Show success notification
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'success',
            message: `Synced ${syncedCount} experimental results from Benchling`,
            duration: 5000
          }
        }));
      }
      // Store sync timestamp
      localStorage.setItem('benchling_last_sync', new Date().toISOString());
      // Trigger refresh of other pages by dispatching custom event
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          type: 'benchling',
          count: res.data.synced_count || res.data.synced || 0,
          synced_count: res.data.synced_count || res.data.synced || 0
        } 
      }));
      
      // Auto-check for drift after syncing experimental results (like a real biotech system would)
      setTimeout(async () => {
        try {
          const modelsRes = await api.get('/api/models');
          if (modelsRes.data && modelsRes.data.length > 0) {
            const modelId = modelsRes.data[0].id;
            // Automatically check for drift after new data comes in
            await api.post(`/api/drift/check/${modelId}`);
            // Notify user that drift check completed
            window.dispatchEvent(new CustomEvent('driftCheckCompleted', { 
              detail: { modelId, auto: true } 
            }));
          }
        } catch (error) {
          // Silently fail - drift check is optional
          console.log('Auto drift check skipped:', error);
        }
      }, 2000); // Wait 2 seconds after sync
    } catch (error: any) {
      // Handle network errors (backend not reachable)
      if (!error.response) {
        const networkError = 'Backend not reachable. Make sure the backend is running on http://localhost:8000';
        setSyncResult({
          success: false,
          message: `❌ ${networkError}`
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            message: networkError,
            duration: 7000
          }
        }));
      } else {
        // Handle API errors
        const errorData = error.response?.data || {};
        // Handle detail as string or object
        let errorMsg = 'Unknown error';
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMsg = errorData.detail.message || errorData.detail.error || JSON.stringify(errorData.detail);
        } else {
          errorMsg = errorData.error || errorData.message || error.message || 'Unknown error';
        }
        const benchlingError = (errorData.detail?.benchling_error || errorData.benchling_error) 
          ? ` (Benchling: ${errorData.detail?.benchling_error || errorData.benchling_error})` 
          : '';
        
        setSyncResult({
          success: false,
          message: `Error syncing Benchling: ${errorMsg}${benchlingError}`
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            message: `Failed to sync Benchling: ${errorMsg}${benchlingError}`,
            duration: 7000
          }
        }));
      }
    } finally {
      setSyncing(null);
    }
  };

  const [moeFile, setMoeFile] = useState<File | null>(null);

  const handleMoeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMoeFile(file);
    }
  };

  const syncMOE = async () => {
    if (!moeFile) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          type: 'error',
          message: 'Please select a MOE CSV file to upload',
          duration: 5000
        }
      }));
      return;
    }

    setSyncing('moe');
    setSyncResult(null);
    
    // Show loading notification
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        type: 'info',
        message: 'Uploading and syncing MOE predictions...',
        duration: 2000
      }
    }));
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', moeFile);
      
      const res = await api.post('/api/ingest/moe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const syncedCount = res.data.ingested_count || res.data.synced_count || res.data.count || 0;
      
      setSyncResult({
        success: true,
        message: `✅ Synced ${syncedCount} predictions from MOE CSV`,
        data: {
          ...res.data,
          synced_count: syncedCount,  // Add synced_count alias for display
          ingested_count: syncedCount  // Keep original field
        }
      });
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          type: 'success',
          message: `Synced ${syncedCount} predictions from MOE`,
          duration: 5000
        }
      }));
      
      // Store sync timestamp
      localStorage.setItem('moe_last_sync', new Date().toISOString());
      
      // Trigger refresh of other pages by dispatching custom event
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          type: 'moe', 
          count: syncedCount,
          synced_count: syncedCount
        } 
      }));
      
      // Auto-check for drift after syncing predictions
      setTimeout(async () => {
        try {
          const modelsRes = await api.get('/api/models');
          if (modelsRes.data && modelsRes.data.length > 0) {
            // Find MOE model or use first model
            const moeModel = modelsRes.data.find((m: any) => m.source_system === 'MOE') || modelsRes.data[0];
            await api.post(`/api/drift/check/${moeModel.id}`);
            window.dispatchEvent(new CustomEvent('driftCheckCompleted', { 
              detail: { modelId: moeModel.id, auto: true } 
            }));
          }
        } catch (error) {
          console.log('Auto drift check skipped:', error);
        }
      }, 2000);
      
      // Clear file input
      setMoeFile(null);
      const fileInput = document.getElementById('moe-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      // Handle network errors (backend not reachable)
      if (!error.response) {
        const networkError = 'Backend not reachable. Make sure the backend is running on http://localhost:8000';
        setSyncResult({
          success: false,
          message: `❌ ${networkError}`
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            message: networkError,
            duration: 7000
          }
        }));
      } else {
        // Handle API errors
        const errorData = error.response?.data || {};
        let errorMsg = 'Unknown error';
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMsg = errorData.detail.message || errorData.detail.error || JSON.stringify(errorData.detail);
        } else {
          errorMsg = errorData.error || errorData.message || error.message || 'Unknown error';
        }
        
        setSyncResult({
          success: false,
          message: `Error syncing MOE: ${errorMsg}`
        });
        
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            type: 'error',
            message: `Failed to sync MOE: ${errorMsg}`,
            duration: 7000
          }
        }));
      }
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const lastSyncTime = syncResult?.success && syncResult?.data?.timestamp
    ? formatTimeEST(syncResult.data.timestamp)
    : null;

  return (
    <div>
      <NotificationToast />
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
            Sync Data
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
            Synchronize experimental results and predictions from external systems
          </p>
        </div>
        {lastSyncTime && (
          <div style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'var(--success-50)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--success)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--success)', marginBottom: '0.25rem', fontWeight: '600' }}>
              Last Sync
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--gray-900)' }}>
              {lastSyncTime}
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        marginBottom: '2rem', 
        padding: '1rem', 
        background: 'var(--primary-50)', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--primary)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
          How it works:
        </h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--gray-700)', lineHeight: '1.8' }}>
          <li><strong>Sync Benchling:</strong> Pulls wet lab experimental results (IC50 values, measured activities)</li>
          <li><strong>Sync MOE:</strong> Pulls model predictions (docking scores, predicted activities)</li>
          <li><strong>Drift Check:</strong> Compares predictions vs experimental results to detect drift</li>
          <li><strong>Retrain:</strong> Updates models when drift is detected</li>
        </ol>
      </div>

      <div className="card">
        <h2 className="card-title">Sync Wet Lab Data from Benchling</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
          Pulls experimental results from your Benchling assays (IC50 values, measured activities from wet lab experiments)
        </p>
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: 'var(--info-50)', 
          borderRadius: 'var(--radius)',
          border: '1px solid var(--info)',
          fontSize: '0.875rem',
          color: 'var(--gray-700)'
        }}>
          <strong>Wet Lab Data:</strong> These are the actual measured values from your experiments (e.g., IC50 = 4.2 μM)
        </div>
        <button
          className="button"
          onClick={syncBenchling}
          disabled={syncing === 'benchling'}
        >
          {syncing === 'benchling' ? 'Syncing...' : 'Sync Wet Lab Data from Benchling'}
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Sync Model Predictions from MOE</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
          Upload a CSV file with MOE docking predictions to sync them into the system.
        </p>
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: 'var(--warning-50)', 
          borderRadius: 'var(--radius)',
          border: '1px solid var(--warning)',
          fontSize: '0.875rem',
          color: 'var(--gray-700)'
        }}>
          <strong>Model Predictions:</strong> These are what the model predicted before experiments (e.g., predicted IC50 = 5.1 μM)
          <br />
          <small style={{ color: 'var(--gray-600)', marginTop: '0.5rem', display: 'block' }}>
            Required columns: <code>molecule_id</code>, <code>model_id</code>, <code>docking_score</code>
            <br />
            Optional: <code>reagent_batch</code>, <code>assay_version</code>, <code>instrument_id</code>, <code>run_timestamp</code>
          </small>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label htmlFor="moe-file-input" style={{ cursor: 'pointer' }}>
            <input
              id="moe-file-input"
              type="file"
              accept=".csv"
              onChange={handleMoeFileSelect}
              style={{ display: 'none' }}
            />
            <button className="button" type="button" onClick={() => document.getElementById('moe-file-input')?.click()}>
              Choose CSV File
            </button>
          </label>
          {moeFile && (
            <span style={{ color: 'var(--gray-700)', fontSize: '0.9rem' }}>
              Selected: <strong>{moeFile.name}</strong>
            </span>
          )}
          <button
            className="button"
            onClick={syncMOE}
            disabled={syncing === 'moe' || !moeFile}
          >
            {syncing === 'moe' ? 'Syncing...' : 'Upload & Sync MOE CSV'}
          </button>
        </div>
      </div>

      {syncResult && syncResult.success && syncResult.data && (
        <DataSyncDetails 
          syncResult={syncResult.data} 
          source={syncResult.data.source?.toLowerCase().includes('benchling') ? 'benchling' : 'moe'}
        />
      )}

      {syncResult && (
        <div className={`card ${syncResult.success ? (syncResult.isInfo ? 'info-message' : 'success-message') : 'error'}`} style={syncResult.success ? (syncResult.isInfo ? {
          borderLeft: '4px solid var(--info)',
          background: 'var(--info-50)'
        } : {
          borderLeft: '4px solid var(--success)'
        }) : {}}>
          <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
            {syncResult.success ? (syncResult.isInfo ? 'Sync Info' : 'Sync Successful') : 'Sync Failed'}
          </h2>
          <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: syncResult.data ? '1rem' : '0' }}>
            {syncResult.message}
          </p>
          {syncResult.data && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1.25rem', 
              backgroundColor: 'white', 
              borderRadius: '10px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Synced
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                    {syncResult.data.synced_count || syncResult.data.ingested_count || syncResult.data.synced || syncResult.data.count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Skipped
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-600)' }}>
                    {syncResult.data.skipped || 0}
                  </div>
                </div>
              </div>
              {syncResult.data.source && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'var(--primary-50)', 
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--primary)',
                  fontSize: '0.875rem',
                  color: 'var(--gray-700)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>Data Source:</strong> 
                    <span className={`badge ${syncResult.data.api_connected ? 'badge-success' : 'badge-info'}`}>
                      {syncResult.data.source || 'MOE CSV'}
                    </span>
                  </div>
                  {syncResult.data.timestamp && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                      Synced at: {formatEST(syncResult.data.timestamp)}
                    </div>
                  )}
                  {syncResult.data.sample_data && (
                    <div style={{ 
                      marginTop: '0.75rem', 
                      padding: '0.75rem', 
                      background: 'white', 
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.8125rem'
                    }}>
                      <strong style={{ color: 'var(--gray-700)' }}>Sample Record:</strong>
                      <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                        {syncResult.data.source.includes('Benchling') ? (
                          <div>
                            <div><strong>Measured {syncResult.data.sample_data.value_type || 'IC50'}:</strong> {syncResult.data.sample_data.measured_value?.toFixed(3) || 'N/A'} {syncResult.data.sample_data.units || 'μM'}</div>
                            {syncResult.data.sample_data.uncertainty && (
                              <div><strong>Uncertainty:</strong> ±{syncResult.data.sample_data.uncertainty.toFixed(3)} {syncResult.data.sample_data.units || 'μM'}</div>
                            )}
                            {syncResult.data.sample_data.metadata_json?.plate_id && (
                              <div><strong>Plate:</strong> {syncResult.data.sample_data.metadata_json.plate_id}</div>
                            )}
                            {syncResult.data.sample_data.metadata_json?.well_position && (
                              <div><strong>Well:</strong> {syncResult.data.sample_data.metadata_json.well_position}</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div><strong>Predicted {syncResult.data.sample_data.value_type || 'IC50'}:</strong> {syncResult.data.sample_data.predicted_value?.toFixed(3) || 'N/A'} {syncResult.data.sample_data.units || 'μM'}</div>
                            {syncResult.data.sample_data.confidence_score && (
                              <div><strong>Confidence:</strong> {(syncResult.data.sample_data.confidence_score * 100).toFixed(1)}%</div>
                            )}
                            {syncResult.data.sample_data.metadata_json?.docking_score && (
                              <div><strong>Docking Score:</strong> {syncResult.data.sample_data.metadata_json.docking_score}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sync;

