/**
 * Main App component with navigation
 */

import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { InspectPage } from './pages/InspectPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { TemplatesPage } from './pages/TemplatesPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Listen for navigation events
  React.useEffect(() => {
    const handleNavigate = () => {
      setActiveTab('inspect');
    };
    window.addEventListener('navigate-to-inspect', handleNavigate);
    return () => {
      window.removeEventListener('navigate-to-inspect', handleNavigate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'inspect' && <InspectPage />}
        {activeTab === 'equipment' && <EquipmentPage />}
        {activeTab === 'templates' && <TemplatesPage />}
      </main>
    </div>
  );
};

