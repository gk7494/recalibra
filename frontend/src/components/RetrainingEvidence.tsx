import React from 'react';
import '../App.css';

interface RetrainingEvidenceProps {
  beforeMetrics: {
    r_squared: number;
    rmse: number;
    mae: number;
  };
  afterMetrics: {
    r_squared: number;
    rmse: number;
    mae: number;
  };
  improvement: {
    r_squared: number;
    rmse: number;
    mae: number;
  };
  evidence?: {
    before_predictions_sample?: number[];
    after_predictions_sample?: number[];
    actual_values_sample?: number[];
    training_data_size?: number;
  };
  modelName: string;
  retrainType: string;
}

const RetrainingEvidence: React.FC<RetrainingEvidenceProps> = ({
  beforeMetrics,
  afterMetrics,
  improvement,
  evidence,
  modelName,
  retrainType
}) => {
  const r2Improvement = improvement.r_squared;
  const rmseImprovement = improvement.rmse;
  const maeImprovement = improvement.mae;

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--success)', marginTop: '1rem' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>
        Retraining Evidence - {modelName}
      </h2>

      {/* Before/After Comparison */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Before vs After Comparison</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {/* R² Score */}
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--gray-200)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>R² Score</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              fontFamily: 'monospace',
              marginBottom: '0.5rem',
              color: beforeMetrics.r_squared < 0 ? 'var(--danger)' : beforeMetrics.r_squared > 0.7 ? 'var(--success)' : 'var(--warning)'
            }}>
              {beforeMetrics.r_squared.toFixed(3)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>
              → {afterMetrics.r_squared.toFixed(3)}
            </div>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: r2Improvement > 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              {r2Improvement > 0 ? '↑' : '↓'} {Math.abs(r2Improvement).toFixed(3)} ({r2Improvement > 0 ? '+' : ''}{(r2Improvement * 100).toFixed(1)}%)
            </div>
          </div>

          {/* RMSE */}
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--gray-200)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>RMSE (μM)</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              fontFamily: 'monospace',
              marginBottom: '0.5rem',
              color: beforeMetrics.rmse > 2 ? 'var(--danger)' : beforeMetrics.rmse < 1 ? 'var(--success)' : 'var(--warning)'
            }}>
              {beforeMetrics.rmse.toFixed(3)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>
              → {afterMetrics.rmse.toFixed(3)}
            </div>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: rmseImprovement > 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              {rmseImprovement > 0 ? '↓' : '↑'} {Math.abs(rmseImprovement).toFixed(3)} ({rmseImprovement > 0 ? '-' : '+'}{(Math.abs(rmseImprovement) / beforeMetrics.rmse * 100).toFixed(1)}%)
            </div>
          </div>

          {/* MAE */}
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--gray-200)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>MAE (μM)</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              fontFamily: 'monospace',
              marginBottom: '0.5rem',
              color: beforeMetrics.mae > 2 ? 'var(--danger)' : beforeMetrics.mae < 1 ? 'var(--success)' : 'var(--warning)'
            }}>
              {beforeMetrics.mae.toFixed(3)}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>
              → {afterMetrics.mae.toFixed(3)}
            </div>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: maeImprovement > 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              {maeImprovement > 0 ? '↓' : '↑'} {Math.abs(maeImprovement).toFixed(3)} ({maeImprovement > 0 ? '-' : '+'}{(Math.abs(maeImprovement) / beforeMetrics.mae * 100).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Training Data Evidence */}
      {evidence && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>🔬 Training Data Evidence</h3>
          <div style={{ 
            padding: '1rem', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Training Samples:</strong> {evidence.training_data_size ? `${evidence.training_data_size}` : 'N/A'} matched pairs
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Retraining Method:</strong> {retrainType}
            </div>
          </div>

          {/* Sample Predictions Comparison */}
          {evidence.before_predictions_sample && evidence.after_predictions_sample && evidence.actual_values_sample && (
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Sample Predictions (First 5)</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Actual Value</th>
                      <th>Before (Original)</th>
                      <th>After (Retrained)</th>
                      <th>Error Before</th>
                      <th>Error After</th>
                      <th>Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.actual_values_sample.slice(0, 5).map((actual, idx) => {
                      const beforePred = evidence.before_predictions_sample?.[idx] || 0;
                      const afterPred = evidence.after_predictions_sample?.[idx] || 0;
                      const errorBefore = Math.abs(actual - beforePred);
                      const errorAfter = Math.abs(actual - afterPred);
                      const improvement = errorBefore - errorAfter;
                      
                      return (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                            {actual.toFixed(3)} μM
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {beforePred.toFixed(3)} μM
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--success)' }}>
                            {afterPred.toFixed(3)} μM
                          </td>
                          <td style={{ 
                            fontFamily: 'monospace',
                            color: errorBefore > 1 ? 'var(--danger)' : 'var(--gray-700)'
                          }}>
                            {errorBefore.toFixed(3)} μM
                          </td>
                          <td style={{ 
                            fontFamily: 'monospace',
                            color: errorAfter > 1 ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {errorAfter.toFixed(3)} μM
                          </td>
                          <td style={{ 
                            fontFamily: 'monospace',
                            fontWeight: '600',
                            color: improvement > 0 ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {improvement > 0 ? '↓' : '↑'} {Math.abs(improvement).toFixed(3)} μM
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improvement Summary */}
      <div style={{ 
        padding: '1.5rem', 
        background: r2Improvement > 0.1 ? 'var(--success-50)' : 'var(--gray-50)', 
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${r2Improvement > 0.1 ? 'var(--success)' : 'var(--gray-300)'}`
      }}>
        <div style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          marginBottom: '0.5rem',
          color: r2Improvement > 0.1 ? 'var(--success)' : 'var(--gray-700)'
        }}>
          {r2Improvement > 0.1 ? 'SIGNIFICANT IMPROVEMENT' : r2Improvement > 0 ? 'Model Improved' : 'Model Performance Similar'}
        </div>
        <div style={{ fontSize: '0.9375rem', color: 'var(--gray-600)' }}>
          The model was retrained on {evidence?.training_data_size ? `${evidence.training_data_size}` : 'some'} real data points from your database.
          {r2Improvement > 0.1 && ' This represents a substantial improvement in model accuracy!'}
        </div>
      </div>
    </div>
  );
};

export default RetrainingEvidence;

