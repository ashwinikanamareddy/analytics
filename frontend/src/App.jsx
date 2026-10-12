import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HeatmapView from './pages/HeatmapView';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('sessions');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  const handleRefreshComplete = () => {
    setIsRefreshing(false);
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="main-content">
        {currentView === 'sessions' && (
          <Dashboard
            isRefreshing={isRefreshing}
            onRefreshComplete={handleRefreshComplete}
          />
        )}

        {currentView === 'heatmap' && (
          <HeatmapView
            isRefreshing={isRefreshing}
            onRefreshComplete={handleRefreshComplete}
          />
        )}
      </main>
    </div>
  );
}
