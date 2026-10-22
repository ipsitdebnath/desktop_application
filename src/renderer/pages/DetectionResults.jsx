import React from 'react';
import { ShieldAlert, ScanSearch } from 'lucide-react';

export default function DetectionResults({ onNavigate }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Detection Results</h1>
          <p className="page-header-sub">Review PII findings from your latest document scan</p>
        </div>
      </div>

      <div className="page-scroll">
        <div className="empty-state fade-up">
          <div className="empty-icon"><ShieldAlert /></div>
          <h3>No results available</h3>
          <p>
            Scan a document first. Detection results — including PII category, detected value,
            confidence level, and redaction options — will appear here once scanning is implemented.
          </p>
          <button className="btn btn-primary mt-md" onClick={() => onNavigate('scan')}>
            <ScanSearch size={16} />
            Go to Scan
          </button>
        </div>
      </div>
    </>
  );
}
