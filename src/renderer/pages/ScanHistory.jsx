import React from 'react';
import { History, Trash2 } from 'lucide-react';

export default function ScanHistory({ onNavigate, toast }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Scan History</h1>
          <p className="page-header-sub">Past scan metadata — original documents are never stored</p>
        </div>
        <button className="btn btn-secondary" disabled>
          <Trash2 size={16} />
          Clear History
        </button>
      </div>

      <div className="page-scroll">
        <div className="empty-state fade-up">
          <div className="empty-icon"><History /></div>
          <h3>No scan history</h3>
          <p>
            Completed scans will be recorded here with their file name, timestamp, detection count,
            and risk level. Sensitive content is never stored in history.
          </p>
          <button className="btn btn-primary mt-md" onClick={() => onNavigate('scan')}>
            Scan your first document
          </button>
        </div>
      </div>
    </>
  );
}
