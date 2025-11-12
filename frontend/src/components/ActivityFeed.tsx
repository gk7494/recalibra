import React, { useState, useEffect } from 'react';
import { formatEST } from '../utils/timeUtils';
import '../App.css';

interface Activity {
  id: string;
  type: 'sync' | 'drift_check' | 'retrain' | 'update';
  source: string;
  message: string;
  timestamp: Date;
  status: 'success' | 'error' | 'pending';
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Load activities from localStorage on mount
    const savedActivities = localStorage.getItem('recalibra_activities');
    if (savedActivities) {
      try {
        const parsed = JSON.parse(savedActivities);
        setActivities(parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })).slice(0, 20));
      } catch (e) {
        console.error('Error loading saved activities:', e);
      }
    }

    // Listen for sync events
    const handleSync = (e: CustomEvent) => {
      const detail = e.detail || {};
      const count = detail.count || detail.synced_count || detail.synced || 0;
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'sync',
        source: detail.type === 'benchling' ? 'Benchling API' : 'MOE API',
        message: detail.type === 'benchling' 
          ? `Synced ${count} experimental results from Benchling`
          : `Synced ${count} predictions from MOE`,
        timestamp: new Date(),
        status: 'success'
      };
      setActivities(prev => {
        const updated = [activity, ...prev].slice(0, 20);
        localStorage.setItem('recalibra_activities', JSON.stringify(updated));
        return updated;
      });
    };

    // Listen for drift check events
    const handleDriftCheck = (e: CustomEvent) => {
      const detail = e.detail || {};
      const driftDetected = detail.drift_detected || detail.driftDetected;
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'drift_check',
        source: `Model ${detail.modelId || 'Unknown'}`,
        message: driftDetected 
          ? 'Drift detected - model accuracy degraded'
          : 'No drift detected - model performing well',
        timestamp: new Date(),
        status: driftDetected ? 'error' : 'success'
      };
      setActivities(prev => {
        const updated = [activity, ...prev].slice(0, 20);
        localStorage.setItem('recalibra_activities', JSON.stringify(updated));
        return updated;
      });
    };

    // Listen for retrain events
    const handleRetrain = (e: CustomEvent) => {
      const detail = e.detail || {};
      const metrics = detail.metrics || {};
      const r2 = metrics.r_squared || metrics.r_squared || 0;
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'retrain',
        source: `Model ${detail.modelId || 'Unknown'}`,
        message: `Model retrained - R²: ${r2.toFixed(3)}`,
        timestamp: new Date(),
        status: 'success'
      };
      setActivities(prev => {
        const updated = [activity, ...prev].slice(0, 20);
        localStorage.setItem('recalibra_activities', JSON.stringify(updated));
        return updated;
      });
    };

    // Listen for error events
    const handleError = (e: CustomEvent) => {
      const detail = e.detail || {};
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'update',
        source: detail.source || 'System',
        message: detail.message || 'An error occurred',
        timestamp: new Date(),
        status: 'error'
      };
      setActivities(prev => {
        const updated = [activity, ...prev].slice(0, 20);
        localStorage.setItem('recalibra_activities', JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('dataUpdated', handleSync as EventListener);
    window.addEventListener('driftCheckCompleted', handleDriftCheck as EventListener);
    window.addEventListener('modelRetrained', handleRetrain as EventListener);
    window.addEventListener('activityError', handleError as EventListener);

    return () => {
      window.removeEventListener('dataUpdated', handleSync as EventListener);
      window.removeEventListener('driftCheckCompleted', handleDriftCheck as EventListener);
      window.removeEventListener('modelRetrained', handleRetrain as EventListener);
      window.removeEventListener('activityError', handleError as EventListener);
    };
  }, []);

  return (
    <div className="card">
      <h2 className="card-title">Live Activity Feed</h2>
      {activities.length === 0 ? (
        <div className="empty-state">
          <p>No recent activity.</p>
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {activities.map((activity) => (
            <div
              key={activity.id}
              style={{
                padding: '1rem',
                marginBottom: '0.75rem',
                background: activity.status === 'success' ? 'var(--success-50)' : 'var(--danger-50)',
                borderRadius: 'var(--radius)',
                border: `1px solid ${activity.status === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                borderLeft: `4px solid ${activity.status === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ 
                      fontSize: '1.25rem',
                      display: 'inline-block'
                    }}>
                      {activity.type === 'sync' && <span style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>↻</span>}
                      {activity.type === 'drift_check' && <span style={{ fontSize: '0.875rem', color: 'var(--info)' }}>◉</span>}
                      {activity.type === 'retrain' && <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>◼</span>}
                      {activity.type === 'update' && <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>◼</span>}
                    </span>
                    <strong style={{ color: 'var(--gray-900)', fontSize: '0.9375rem' }}>
                      {activity.source}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginLeft: '1.75rem' }}>
                    {activity.message}
                  </div>
                </div>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: activity.status === 'success' ? 'var(--success-50)' : 'var(--danger-50)',
                  color: activity.status === 'success' ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${activity.status === 'success' ? 'var(--success)' : 'var(--danger)'}`
                }}>
                  {activity.status === 'success' ? 'Success' : 'Error'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                {formatEST(activity.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;

