import React from 'react';
import {
  Shield,
  LayoutDashboard,
  ScanSearch,
  FileWarning,
  History,
  Settings,
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'scan',      label: 'Scan Document',      icon: ScanSearch },
  { id: 'results',   label: 'Detection Results',  icon: FileWarning },
  { id: 'history',   label: 'Scan History',        icon: History },
  { id: 'settings',  label: 'Settings',            icon: Settings },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="sidebar">
      {/* ── Brand ────────────────────────────────────── */}
      <div className="sidebar-head">
        <div className="sidebar-logo"><Shield /></div>
        <div>
          <div className="sidebar-brand">PII Shield</div>
          <div className="sidebar-sub">Detection System</div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <div
            key={n.id}
            className={`nav-item${current === n.id ? ' active' : ''}`}
            onClick={() => onNavigate(n.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onNavigate(n.id)}
          >
            <n.icon />
            <span>{n.label}</span>
          </div>
        ))}
      </nav>

      {/* ── Footer disclaimer ────────────────────────── */}
      <div className="sidebar-foot">
        <div className="sidebar-foot-text">
          <span className="warn">⚠ Prototype Only</span>
          Heuristic detection — not a legal compliance tool. Results require human review.
        </div>
      </div>
    </aside>
  );
}
