import React, { useState, useCallback, useEffect } from 'react';
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
  const [latestScan, setLatestScan] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = window.electronAPI?.loadHistory
          ? await window.electronAPI.loadHistory()
          : JSON.parse(localStorage.getItem('pii-shield-history') || '[]');
        setHistory(Array.isArray(data) ? data : []);
      } catch { setHistory([]); }
    };
    load();
  }, []);

  const handleScanComplete = useCallback(async (scan) => {
    setLatestScan(scan);
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: scan.file.name, size: scan.file.size, ext: scan.file.ext, timestamp: scan.timestamp, piiCount: scan.findings.length, riskLevel: scan.risk.level };
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    try {
      if (window.electronAPI?.saveHistory) await window.electronAPI.saveHistory(next);
      else localStorage.setItem('pii-shield-history', JSON.stringify(next));
    } catch { /* scan results remain available in the current session */ }
    setPage('results');
  }, [history]);

  // Toast helper — auto-dismiss after 4 s
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const go = useCallback((p) => setPage(p), []);

  const pages = {
    dashboard:  <Dashboard onNavigate={go} history={history} latestScan={latestScan} />,
    scan:       <ScanDocument onNavigate={go} toast={toast} onScanComplete={handleScanComplete} />,
    results:    <DetectionResults onNavigate={go} latestScan={latestScan} toast={toast} />,
    history:    <ScanHistory onNavigate={go} toast={toast} />,
    settings:   <Settings toast={toast} />,
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
