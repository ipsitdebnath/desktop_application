import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Info, Save, RotateCcw } from 'lucide-react';

const DETECTION_TYPES = [
  { id: 'aadhaar',          name: 'Aadhaar Number',    desc: '12-digit unique ID' },
  { id: 'pan',              name: 'PAN Number',        desc: 'Permanent Account Number' },
  { id: 'driving_licence',  name: 'Driving Licence',   desc: 'State-issued DL number' },
  { id: 'phone',            name: 'Phone Number',      desc: 'Indian mobile / landline' },
  { id: 'email',            name: 'Email Address',     desc: 'Email addresses' },
  { id: 'passport',         name: 'Passport Number',   desc: 'Indian passport number' },
  { id: 'voter_id',         name: 'Voter ID',          desc: 'EPIC number' },
  { id: 'pincode',          name: 'PIN Code',          desc: 'Indian postal code' },
  { id: 'dob',              name: 'Date of Birth',     desc: 'Date patterns' },
  { id: 'credit_card',      name: 'Credit Card',       desc: 'Luhn-checked card candidates' },
];

const STORAGE_KEY = 'pii-shield-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveSettings(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function defaultEnabled() {
  return DETECTION_TYPES.reduce((acc, t) => ({ ...acc, [t.id]: true }), {});
}

export default function Settings({ toast }) {
  const [enabled, setEnabled] = useState(() => {
    const stored = loadSettings();
    return stored?.detectionPatterns ?? defaultEnabled();
  });
  const [maxFileSize, setMaxFileSize] = useState(() => {
    const stored = loadSettings();
    return stored?.maxFileSizeMB ?? 50;
  });
  const [saved, setSaved] = useState(true);

  const toggle = (id) => {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings({ detectionPatterns: enabled, maxFileSizeMB: maxFileSize });
    setSaved(true);
    toast?.('Settings saved', 'success');
  };

  const handleReset = () => {
    const defaults = defaultEnabled();
    setEnabled(defaults);
    setMaxFileSize(50);
    saveSettings({ detectionPatterns: defaults, maxFileSizeMB: 50 });
    setSaved(true);
    toast?.('Settings reset to defaults', 'info');
  };

  // Auto-save when maxFileSize changes
  useEffect(() => {
    setSaved(false);
  }, [maxFileSize]);

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header-sub">Configure detection patterns and application behaviour</p>
        </div>
        <div className="flex-row">
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saved}
          >
            <Save size={14} />
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Detection patterns ─────────────────────── */}
        <div className="card fade-up mb-md">
          <div className="card-title">
            Detection Patterns
            <span className="settings-count">{enabledCount} of {DETECTION_TYPES.length} active</span>
          </div>
          {DETECTION_TYPES.map(t => (
            <div className="setting-row" key={t.id}>
              <div>
                <div className="setting-name">{t.name}</div>
                <div className="setting-desc">{t.desc}</div>
              </div>
              <div
                className={`toggle${enabled[t.id] ? ' on' : ''}`}
                onClick={() => toggle(t.id)}
                role="switch"
                aria-checked={enabled[t.id]}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggle(t.id)}
              />
            </div>
          ))}
        </div>

        {/* ── File limits ────────────────────────────── */}
        <div className="card fade-up fade-up-d1 mb-md">
          <div className="card-title">File Upload Limits</div>
          <div className="setting-row">
            <div>
              <div className="setting-name">Maximum File Size</div>
              <div className="setting-desc">Files exceeding this limit will be rejected</div>
            </div>
            <div className="flex-row">
              <input
                type="number"
                className="settings-input"
                value={maxFileSize}
                min={1}
                max={500}
                onChange={e => setMaxFileSize(Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
              />
              <span className="setting-desc">MB</span>
            </div>
          </div>
          <div className="setting-row" style={{ border: 'none' }}>
            <div>
              <div className="setting-name">Supported Formats</div>
              <div className="setting-desc">File types accepted for scanning</div>
            </div>
            <div className="format-pills" style={{ justifyContent: 'flex-end' }}>
              <span className="format-pill">.TXT</span>
              <span className="format-pill">.PDF</span>
              <span className="format-pill">.PNG</span>
              <span className="format-pill">.JPG</span>
            </div>
          </div>
        </div>

        {/* ── Application info ───────────────────────── */}
        <div className="card fade-up fade-up-d2">
          <div className="card-title">About PII Shield</div>
          <div className="setting-row">
            <div>
              <div className="setting-name">Version</div>
            <div className="setting-desc">1.0.0 — local heuristic detection and redaction</div>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-name">Architecture</div>
              <div className="setting-desc">Electron + React 19 + Vite — fully local processing</div>
            </div>
          </div>
          <div className="setting-row" style={{ border: 'none' }}>
            <div>
              <div className="setting-name">Security</div>
              <div className="setting-desc">Context isolation enabled, Node integration disabled, sandboxed preload bridge</div>
            </div>
          </div>
          <div className="alert alert-info mt-sm">
            <Info />
            <div>
              Pattern toggles apply to the next scan. Settings are stored locally in your application data folder.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
