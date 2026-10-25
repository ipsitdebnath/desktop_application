import React from 'react';
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  Activity,
  ScanSearch,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function Dashboard({ onNavigate, history = [], latestScan }) {
  const piiCount = history.reduce((sum, item) => sum + (item.piiCount || 0), 0);
  const risk = latestScan?.risk?.label || history[0]?.riskLevel || '—';
  return (
    <>
      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-sub">PII detection overview and quick actions</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('scan')}>
          <ScanSearch size={16} />
          New Scan
        </button>
      </div>

      <div className="page-scroll">
        {/* ── Stat cards ──────────────────────────────── */}
        <div className="stats-row fade-up">
          <StatCard icon={<FileText />} color="blue"  value={history.length} label="Documents Scanned" />
          <StatCard icon={<ShieldAlert />} color="teal" value={piiCount} label="PII Detected" />
          <StatCard icon={<AlertTriangle />} color="amber" value={risk} label="Risk Level" />
          <StatCard icon={<Activity />} color="red" value={history[0] ? new Date(history[0].timestamp).toLocaleDateString() : '—'} label="Last Scan" />
        </div>

        {/* ── Disclaimer ─────────────────────────────── */}
        <div className="alert alert-warning mb-md fade-up fade-up-d1">
          <AlertTriangle />
          <div>
            <strong>Important:</strong> PII Shield uses heuristic pattern matching.
            Detection is not guaranteed to be complete or accurate.
            Always verify results manually. This is a prototype, not a certified
            legal compliance tool.
          </div>
        </div>

        {/* ── Quick actions ──────────────────────────── */}
        <div className="section fade-up fade-up-d2">
          <div className="section-title">Quick Actions</div>
          <div className="qa-grid">
            <div className="qa-card" onClick={() => onNavigate('scan')}>
              <div className="qa-left">
                <div className="stat-icon c-blue"><ScanSearch /></div>
                <div>
                  <div className="qa-title">Scan a Document</div>
                  <div className="qa-desc">Upload TXT, PDF, PNG, or JPG</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="qa-card" onClick={() => onNavigate('history')}>
              <div className="qa-left">
                <div className="stat-icon c-amber"><Clock /></div>
                <div>
                  <div className="qa-title">Scan History</div>
                  <div className="qa-desc">View past scan metadata</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div className="qa-card" onClick={() => onNavigate('results')}>
              <div className="qa-left">
                <div className="stat-icon c-teal"><ShieldAlert /></div>
                <div>
                  <div className="qa-title">Detection Results</div>
                  <div className="qa-desc">Review findings from the latest scan</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        {/* ── Recent scans (empty state for Day 1) ──── */}
        <div className="section fade-up fade-up-d3">
          <div className="section-title">Recent Scans</div>
          <div className="empty-state">
            <div className="empty-icon"><ScanSearch /></div>
            <h3>No scans yet</h3>
            <p>Upload a document to begin detecting PII. Detection, OCR, and redaction
            capabilities will be available in upcoming builds.</p>
            <button className="btn btn-primary mt-md" onClick={() => onNavigate('scan')}>
              <ScanSearch size={16} />
              Start Scanning
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Reusable stat card ──────────────────────────────────── */
function StatCard({ icon, color, value, label }) {
  return (
    <div className={`stat-card c-${color}`}>
      <div className={`stat-icon c-${color}`}>{icon}</div>
      <div className="stat-body">
        <div className="stat-val">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  );
}
