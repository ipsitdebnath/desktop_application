import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Trash2,
  FileText,
  FileType2,
  Image,
  Clock,
  ScanSearch,
  AlertTriangle,
} from 'lucide-react';

function extIcon(ext) {
  if (ext === '.pdf') return <FileType2 />;
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return <Image />;
  return <FileText />;
}

function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ScanHistory({ onNavigate, toast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load history from Electron or fallback to localStorage
  const loadHistory = useCallback(async () => {
    try {
      let data;
      if (window.electronAPI?.loadHistory) {
        data = await window.electronAPI.loadHistory();
      } else {
        const raw = localStorage.getItem('pii-shield-history');
        data = raw ? JSON.parse(raw) : [];
      }
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const clearAll = useCallback(async () => {
    try {
      if (window.electronAPI?.clearHistory) {
        await window.electronAPI.clearHistory();
      } else {
        localStorage.removeItem('pii-shield-history');
      }
      setHistory([]);
      toast?.('Scan history cleared', 'success');
    } catch {
      toast?.('Failed to clear history', 'error');
    }
  }, [toast]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Scan History</h1>
          <p className="page-header-sub">Past scan metadata — original documents are never stored</p>
        </div>
        <button
          className="btn btn-danger btn-sm"
          disabled={history.length === 0}
          onClick={clearAll}
        >
          <Trash2 size={16} />
          Clear History
        </button>
      </div>

      <div className="page-scroll">
        {loading ? (
          <div className="empty-state fade-up">
            <div className="spinner" />
            <p style={{ marginTop: 16 }}>Loading history…</p>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state fade-up">
            <div className="empty-icon"><History /></div>
            <h3>No scan history</h3>
            <p>
              Completed scans will be recorded here with their file name, timestamp, detection count,
              and risk level. Sensitive content is never stored in history.
            </p>
            <button className="btn btn-primary mt-md" onClick={() => onNavigate('scan')}>
              <ScanSearch size={16} />
              Scan your first document
            </button>
          </div>
        ) : (
          <div className="fade-up">
            <div className="section-title flex-between">
              <span>{history.length} scan{history.length !== 1 ? 's' : ''} recorded</span>
            </div>
            {history.map((item, i) => (
              <div
                className="history-item"
                key={item.id ?? i}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="history-icon">{extIcon(item.ext || '')}</div>
                <div className="history-body">
                  <div className="history-name">{item.name || 'Unknown file'}</div>
                  <div className="history-meta">
                    <span><Clock size={12} /> {formatDate(item.timestamp)}</span>
                    <span>{formatBytes(item.size)}</span>
                    <span>{(item.ext || '').toUpperCase().replace('.', '')} file</span>
                  </div>
                </div>
                {item.riskLevel && (
                  <span className={`badge badge-${item.riskLevel}`}>
                    {item.riskLevel}
                  </span>
                )}
                {item.piiCount != null && (
                  <span className="badge badge-medium">
                    <AlertTriangle size={11} /> {item.piiCount} PII
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
