// Model Dashboard page - shows metrics, drift, and records for a specific model
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import { api } from '../services/api';
import FileUpload from '../components/FileUpload';
import '../App.css';

interface MetricsTimeSeries {
  time_buckets: string[];
  rmse: number[];
  mae: number[];
  r_squared: number[];
  n_samples: number[];
}

interface DriftResult {
  is_drifting: boolean;
  ks_statistic?: number;
  ks_p_value?: number;
  psi_value?: number;
  kl_divergence?: number;
  triggered_tests?: string[];
  baseline_window_size?: number;
  recent_window_size?: number;
}

interface Record {
  id: string;
  dataset_id: string;
  molecule_id: string;
  assay_version?: string;
  reagent_batch?: string;
  instrument_id?: string;
  operator_id?: string;
  prediction_value: number;
  observed_value: number;
  timestamp: string;
}

const ModelDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsTimeSeries | null>(null);
  const [drift, setDrift] = useState<DriftResult | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [model, setModel] = useState<any>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadModelData(id);
    }
  }, [id]);

  const loadModelData = async (modelId: string) => {
    setLoading(true);
    try {
      // Load model info
      const modelRes = await api.get(`/api/models/${modelId}`);
      setModel(modelRes.data);

      // Load metrics
      try {
        const metricsRes = await api.get(`/api/models/${modelId}/metrics?bucket_size=week`);
        setMetrics(metricsRes.data);
      } catch (error: any) {
        console.error('Error loading metrics:', error);
        // Metrics might not be available if no data yet
        if (error.response?.status !== 400) {
          console.warn('Metrics endpoint returned error:', error.response?.data);
        }
      }

      // Load drift detection
      try {
        const driftRes = await api.get(`/api/models/${modelId}/drift`);
        setDrift(driftRes.data);
      } catch (error: any) {
        console.error('Error loading drift:', error);
        // Drift might not be available if insufficient data
        if (error.response?.status !== 400) {
          console.warn('Drift endpoint returned error:', error.response?.data);
        }
      }

      // Load recent records (get datasets first, then records)
      try {
        const datasetsRes = await api.get('/api/datasets');
        const datasets = datasetsRes.data || [];
        const modelDatasets = datasets.filter((d: any) => d.model_id === modelId);
        if (modelDatasets && modelDatasets.length > 0) {
          const dsId = modelDatasets[0].id;
          setDatasetId(dsId);
          const recordsRes = await api.get(`/api/datasets/${dsId}/records?limit=50`);
          setRecords(recordsRes.data || []);
        } else {
          console.warn('No datasets found for model');
          setRecords([]);
        }
      } catch (error: any) {
        console.error('Error loading records:', error);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error loading model data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="loading">Loading model dashboard...</div>
        <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Fetching metrics, drift data, and records...</p>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="card">
        <h2>Model not found</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
          The model you're looking for doesn't exist or has been deleted.
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            background: 'var(--gray-100)',
            border: '1px solid var(--gray-300)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer'
          }}
        >
          ← Back to Models
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--gray-900)' }}>
          {model.name}
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
          {model.source_system} • {model.type || 'N/A'}
        </p>
      </div>

      {/* Drift Summary Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">🔍 Drift Detection</h2>
        {drift ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: drift.is_drifting ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${drift.is_drifting ? 'var(--danger)' : 'var(--success)'}`
            }}>
              <span style={{ fontSize: '3rem' }}>
                {drift.is_drifting ? '⚠️' : '✅'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: drift.is_drifting ? 'var(--danger)' : 'var(--success)' }}>
                  {drift.is_drifting ? 'DRIFT DETECTED' : 'No Drift Detected'}
                </div>
                {drift.triggered_tests && drift.triggered_tests.length > 0 && (
                  <div style={{ fontSize: '1rem', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    <strong>Triggered tests:</strong> {drift.triggered_tests.map(t => `• ${t}`).join(' ')}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Baseline window: {drift.baseline_window_size || 0} records • Recent window: {drift.recent_window_size || 0} records
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {drift.ks_statistic !== undefined && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>KS Statistic</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {drift.ks_statistic.toFixed(4)}
                  </div>
                  {drift.ks_p_value !== undefined && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      p-value: {drift.ks_p_value.toFixed(4)}
                    </div>
                  )}
                </div>
              )}
              {drift.psi_value !== undefined && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>PSI Value</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {drift.psi_value.toFixed(4)}
                  </div>
                </div>
              )}
              {drift.kl_divergence !== undefined && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>KL Divergence</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {drift.kl_divergence.toFixed(4)}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Window Sizes</div>
                <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  Baseline: {drift.baseline_window_size || 0}<br />
                  Recent: {drift.recent_window_size || 0}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--gray-500)' }}>No drift data available. Run a drift check to see results.</p>
        )}
      </div>

      {/* Metrics Charts */}
      {metrics && metrics.time_buckets && metrics.time_buckets.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 className="card-title">📈 RMSE Over Time</h2>
            <Plot
              data={[{
                x: metrics.time_buckets,
                y: metrics.rmse,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'RMSE',
                line: { color: 'var(--warning)', width: 3 },
                marker: { size: 8 }
              }]}
              layout={{
                xaxis: { title: 'Time', gridcolor: 'var(--gray-200)' },
                yaxis: { title: 'RMSE', gridcolor: 'var(--gray-200)' },
                height: 400,
                plot_bgcolor: 'white',
                paper_bgcolor: 'white'
              }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 className="card-title">📊 R² Over Time</h2>
            <Plot
              data={[{
                x: metrics.time_buckets,
                y: metrics.r_squared,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'R²',
                line: { color: 'var(--primary)', width: 3 },
                marker: { size: 8 }
              }]}
              layout={{
                xaxis: { title: 'Time', gridcolor: 'var(--gray-200)' },
                yaxis: { title: 'R²', range: [-1, 1], gridcolor: 'var(--gray-200)' },
                height: 400,
                plot_bgcolor: 'white',
                paper_bgcolor: 'white'
              }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </>
      )}

      {/* File Upload */}
      {datasetId && (
        <div style={{ marginBottom: '2rem' }}>
          <FileUpload
            datasetId={datasetId}
            onUploadComplete={() => {
              if (id) {
                loadModelData(id);
              }
            }}
          />
        </div>
      )}

      {/* Recent Records Table */}
      <div className="card">
        <h2 className="card-title">📋 Recent Records</h2>
        {records.length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>No records found. Upload a CSV to add data.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Molecule ID</th>
                  <th>Prediction</th>
                  <th>Observed</th>
                  <th>Error</th>
                  <th>Assay Version</th>
                  <th>Reagent Batch</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const error = record.prediction_value - record.observed_value;
                  return (
                    <tr key={record.id}>
                      <td style={{ fontFamily: 'monospace' }}>{record.molecule_id}</td>
                      <td style={{ fontFamily: 'monospace' }}>{record.prediction_value.toFixed(3)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{record.observed_value.toFixed(3)}</td>
                      <td style={{
                        fontFamily: 'monospace',
                        color: Math.abs(error) > 10 ? 'var(--danger)' : 'var(--gray-700)'
                      }}>
                        {error.toFixed(3)}
                      </td>
                      <td>{record.assay_version || 'N/A'}</td>
                      <td>{record.reagent_batch || 'N/A'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelDashboard;

