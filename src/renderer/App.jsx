import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ScanDocument from './pages/ScanDocument.jsx';
import DetectionResults from './pages/DetectionResults.jsx';
import ScanHistory from './pages/ScanHistory.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Toast helper — auto-dismiss after 4 s
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const go = useCallback((p) => setPage(p), []);

  const pages = {
    dashboard:  <Dashboard onNavigate={go} toast={toast} />,
    scan:       <ScanDocument onNavigate={go} toast={toast} />,
    results:    <DetectionResults onNavigate={go} />,
    history:    <ScanHistory onNavigate={go} toast={toast} />,
    settings:   <Settings />,
  };

  return (
    <div className="app-layout">
      <Sidebar current={page} onNavigate={go} />
      <div className="main-content">
        {pages[page] ?? pages.dashboard}
      </div>
      <Toast items={toasts} />
    </div>
  );
}
