import React, { useState } from 'react';
import { Settings as SettingsIcon, Info } from 'lucide-react';

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
];

export default function Settings() {
  const [enabled, setEnabled] = useState(
    () => DETECTION_TYPES.reduce((acc, t) => ({ ...acc, [t.id]: true }), {})
  );

  const toggle = (id) => setEnabled(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header-sub">Configure detection patterns and application behaviour</p>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Detection patterns ─────────────────────── */}
        <div className="card fade-up mb-md">
          <div className="card-title">Detection Patterns</div>
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

        {/* ── Application info ───────────────────────── */}
        <div className="card fade-up fade-up-d1">
          <div className="card-title">About PII Shield</div>
          <div className="setting-row" style={{ border: 'none' }}>
            <div>
              <div className="setting-name">Version</div>
              <div className="setting-desc">1.0.0 — Day 1 (UI Foundation)</div>
            </div>
          </div>
          <div className="alert alert-info mt-sm">
            <Info />
            <div>
              Pattern toggles above will take effect once the detection engine is
              connected in a future build. Settings are stored locally in your
              application data folder.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
