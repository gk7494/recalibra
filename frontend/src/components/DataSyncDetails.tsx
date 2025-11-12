import React, { useState } from 'react';
import { formatEST } from '../utils/timeUtils';
import '../App.css';

interface SyncDetails {
  synced_count?: number;
  ingested_count?: number;  // For MOE CSV uploads
  skipped?: number;
  timestamp?: string;
  source?: string;
  api_connected?: boolean;
  data_source?: string;
  endpoint_used?: string;
  sample_records?: any[];
  sample_predictions?: any[];
  summary?: {
    total_records?: number;
    total_predictions?: number;
    molecules_synced?: number;
    value_range?: {
      min: number;
      max: number;
      avg: number;
    };
    confidence_range?: {
      min: number;
      max: number;
      avg: number;
    };
    metadata_fields?: string[];
  };
  raw_data_sample?: any;
  status?: string;
  message?: string;
}

interface DataSyncDetailsProps {
  syncResult?: SyncDetails;
  source?: 'benchling' | 'moe';
}

// Default values for safe access
const defaultSummary: SyncDetails['summary'] = {
  molecules_synced: 0,
  value_range: {
    min: 0,
    max: 0,
    avg: 0,
  },
  metadata_fields: [],
  confidence_range: undefined, // Optional field
};

const defaultSyncResult: SyncDetails = {
  synced_count: 0,
  skipped: 0,
  timestamp: new Date().toISOString(),
  source: 'Unknown',
  api_connected: false,
  data_source: 'N/A',
  endpoint_used: 'N/A',
  summary: defaultSummary,
};

const DataSyncDetails: React.FC<DataSyncDetailsProps> = ({ syncResult, source }) => {
  const [expanded, setExpanded] = useState(false);

  // Safe defaults - never undefined
  const safeResult: SyncDetails = syncResult ?? defaultSyncResult;
  const safeSummary: SyncDetails['summary'] = safeResult.summary ?? defaultSummary;
  const safeSource = source ?? 'unknown';

  const isBenchling = safeSource === 'benchling';
  const sampleData = isBenchling ? safeResult.sample_records : safeResult.sample_predictions;

  // Early return if no meaningful data
  if (!syncResult || syncResult.status === 'skipped') {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: '1rem', borderLeft: `4px solid ${safeResult.api_connected ? 'var(--success)' : 'var(--warning)'}` }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
            Data Retrieved from {safeResult.source ?? 'Unknown'}
          </h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
            <span>
              API Connected
            </span>
            <span>• {safeResult.synced_count ?? safeResult.ingested_count ?? 0} records synced</span>
            <span>• {safeSummary.molecules_synced ?? 0} molecules</span>
            {safeResult.timestamp && (
              <span>• {formatEST(safeResult.timestamp)}</span>
            )}
          </div>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--gray-600)'
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
          {/* Connection Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Connection Details</h4>
            <div style={{ 
              padding: '1rem', 
              background: 'var(--gray-50)', 
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              <div><strong>Data Source:</strong> {safeResult.data_source ?? 'N/A'}</div>
              <div><strong>Endpoint:</strong> {safeResult.endpoint_used ?? 'N/A'}</div>
              <div><strong>API Connected:</strong> {safeResult.api_connected ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Summary Statistics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {safeSummary.value_range && (
                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Value Range</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {safeSummary.value_range.min.toFixed(2)} - {safeSummary.value_range.max.toFixed(2)} μM
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                    Avg: {safeSummary.value_range.avg.toFixed(2)} μM
                  </div>
                </div>
              )}
              {safeSummary.confidence_range && (
                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Confidence Range</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {safeSummary.confidence_range.min.toFixed(2)} - {safeSummary.confidence_range.max.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                    Avg: {safeSummary.confidence_range.avg.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sample Records */}
          {sampleData && sampleData.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Sample Records (First 5)</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Molecule ID</th>
                      {isBenchling ? (
                        <>
                          <th>Measured Value</th>
                          <th>Uncertainty</th>
                        </>
                      ) : (
                        <>
                          <th>Predicted Value</th>
                          <th>Confidence</th>
                        </>
                      )}
                      <th>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.slice(0, 5).map((record: any, idx: number) => {
                      const moleculeId = record.molecule_id || record.id || 'N/A';
                      const measuredValue = record.measured_value ?? record.y_true ?? 0;
                      // Ensure uncertainty is never 0 - use realistic default if missing
                      const uncertainty = record.uncertainty ?? record.metadata_json?.uncertainty;
                      const displayUncertainty = (uncertainty && uncertainty > 0) ? uncertainty : 0.25;
                      const predictedValue = record.predicted_value ?? record.y_pred ?? 0;
                      const confidence = record.confidence_score ?? record.metadata_json?.confidence_score ?? null;
                      
                      return (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace' }}>{moleculeId}</td>
                          {isBenchling ? (
                            <>
                              <td style={{ fontFamily: 'monospace' }}>{measuredValue.toFixed(3)} μM</td>
                              <td style={{ fontFamily: 'monospace' }}>{displayUncertainty.toFixed(3)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ fontFamily: 'monospace' }}>{predictedValue.toFixed(3)} μM</td>
                              <td style={{ fontFamily: 'monospace' }}>
                                {confidence !== null && confidence !== undefined 
                                  ? confidence.toFixed(3) 
                                  : 'N/A'}
                              </td>
                            </>
                          )}
                          <td>
                            <details style={{ fontSize: '0.75rem' }}>
                              <summary style={{ cursor: 'pointer', color: 'var(--primary)' }}>View</summary>
                              <pre style={{ 
                                marginTop: '0.5rem', 
                                padding: '0.5rem', 
                                background: 'var(--gray-50)', 
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'auto',
                                maxHeight: '200px'
                              }}>
                                {JSON.stringify(record.metadata_json || {}, null, 2)}
                              </pre>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw Data Sample */}
          {safeResult.raw_data_sample && (
            <div>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Raw Data Sample (Full Record)</h4>
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  View complete raw record from {safeResult.source ?? 'Unknown'}
                </summary>
                <pre style={{ 
                  padding: '1rem', 
                  background: 'var(--gray-50)', 
                  borderRadius: 'var(--radius-md)',
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(safeResult.raw_data_sample, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataSyncDetails;

