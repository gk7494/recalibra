import React, { useState, useEffect } from 'react';
import { formatTimeEST } from '../utils/timeUtils';
import '../App.css';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'drift' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

const getTitleForType = (type: string) => {
  switch(type) {
    case 'success': return 'Success';
    case 'error': return 'Error';
    case 'warning': return 'Warning';
    case 'info': return 'Info';
    default: return 'Notification';
  }
};

const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleShowNotification = (e: CustomEvent) => {
      const detail = e.detail || {};
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type: (detail.type || 'info') as Notification['type'],
        title: detail.title || getTitleForType(detail.type || 'info'),
        message: detail.message || 'Notification',
        timestamp: new Date()
      };
      setNotifications(prev => [notification, ...prev].slice(0, 5));
      
      // Auto-remove after duration (default 5 seconds)
      const duration = detail.duration || 5000;
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, duration);
    };

    const handleDriftCheck = (e: CustomEvent) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'drift',
        title: 'Drift Check Completed',
        message: e.detail.auto 
          ? 'Automatically checked for drift after data sync'
          : 'Drift check completed',
        timestamp: new Date()
      };
      setNotifications(prev => [notification, ...prev].slice(0, 5));
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    const handleDataSync = (e: CustomEvent) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'success',
        title: e.detail.type === 'benchling' ? 'Benchling Sync' : 'MOE Sync',
        message: e.detail.type === 'benchling' 
          ? 'Experimental results synced successfully'
          : 'Model predictions synced successfully',
        timestamp: new Date()
      };
      setNotifications(prev => [notification, ...prev].slice(0, 5));
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 4000);
    };

    window.addEventListener('showNotification', handleShowNotification as EventListener);
    window.addEventListener('driftCheckCompleted', handleDriftCheck as EventListener);
    window.addEventListener('dataUpdated', handleDataSync as EventListener);
    
    return () => {
      window.removeEventListener('showNotification', handleShowNotification as EventListener);
      window.removeEventListener('driftCheckCompleted', handleDriftCheck as EventListener);
      window.removeEventListener('dataUpdated', handleDataSync as EventListener);
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '400px'
    }}>
      {notifications.map(notif => (
        <div
          key={notif.id}
          style={{
            padding: '1rem 1.25rem',
            background: notif.type === 'drift' ? 'var(--info)' : 
                       notif.type === 'success' ? 'var(--success)' : 
                       notif.type === 'error' ? '#dc3545' :
                       notif.type === 'warning' ? 'var(--warning)' : 
                       notif.type === 'info' ? 'var(--info)' : 'white',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'slideInRight 0.3s ease-out',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            cursor: 'pointer'
          }}
          onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>
              {notif.title}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
              {notif.message}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem' }}>
              {formatTimeEST(notif.timestamp)}
            </div>
          </div>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            onClick={(e) => {
              e.stopPropagation();
              setNotifications(prev => prev.filter(n => n.id !== notif.id));
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;

