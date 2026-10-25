import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, ScanSearch, ShieldAlert } from 'lucide-react';

function findingKey(f) { return `${f.start}:${f.end}`; }
function redactText(text, findings, selected) {
  return [...findings].sort((a, b) => b.start - a.start).reduce((output, f) => {
    if (selected[findingKey(f)] === false) return output;
    return output.slice(0, f.start) + f.maskedValue + output.slice(f.end);
  }, text);
}

export default function DetectionResults({ onNavigate, latestScan, toast }) {
  const findings = latestScan?.findings || [];
  const [selected, setSelected] = useState({});
  const allSelected = findings.length > 0 && findings.every(f => selected[findingKey(f)] !== false);
  const sanitizedText = useMemo(() => redactText(latestScan?.extraction?.text || '', findings, selected), [latestScan, findings, selected]);
  const toggle = f => setSelected(prev => ({ ...prev, [findingKey(f)]: prev[findingKey(f)] === false }));
  const toggleAll = () => setSelected(Object.fromEntries(findings.map(f => [findingKey(f), !allSelected])));
  const download = () => { const url = URL.createObjectURL(new Blob([sanitizedText], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${latestScan.file.name.replace(/\.[^.]+$/, '')}-redacted.txt`; a.click(); URL.revokeObjectURL(url); toast?.('Redacted TXT downloaded', 'success'); };

  if (!latestScan) return <><div className="page-header"><div><h1>Detection Results</h1><p className="page-header-sub">Review PII findings from your latest document scan</p></div></div><div className="page-scroll"><div className="empty-state fade-up"><div className="empty-icon"><ShieldAlert /></div><h3>No results available</h3><p>Scan a document first. Results and redaction controls will appear here.</p><button className="btn btn-primary mt-md" onClick={() => onNavigate('scan')}><ScanSearch size={16} /> Go to Scan</button></div></div></>;

  const grouped = findings.reduce((map, f) => { map[f.label] = (map[f.label] || 0) + 1; return map; }, {});
  return <><div className="page-header"><div><h1>Detection Results</h1><p className="page-header-sub">{latestScan.file.name} · {latestScan.extraction.extractionMethod.toUpperCase()} extraction</p></div><button className="btn btn-primary" disabled={!findings.length} onClick={download}><Download size={16} /> Download Redacted TXT</button></div><div className="page-scroll">
    {latestScan.extraction.warnings?.map(w => <div className="alert alert-warning mb-sm" key={w}><AlertTriangle /><span>{w}</span></div>)}
    <div className={`alert alert-${latestScan.risk.level === 'none' ? 'info' : 'warning'} mb-md`}><ShieldAlert /><div><strong>{latestScan.risk.label} risk (heuristic)</strong><br />{latestScan.risk.description} This is a pattern-matching aid, not proof of identity or legal compliance.</div></div>
    <div className="stats-row mb-md"><div className="card"><div className="card-title">Potential findings</div><div className="stat-val">{findings.length}</div></div><div className="card"><div className="card-title">Pages / sections</div><div className="stat-val">{latestScan.extraction.pageCount ?? '—'}</div></div><div className="card"><div className="card-title">Extraction status</div><div className="stat-val" style={{fontSize:18}}>Complete</div></div></div>
    <div className="card mb-md"><div className="card-title">Findings by category</div>{Object.keys(grouped).length ? Object.entries(grouped).map(([label, count]) => <div className="setting-row" key={label}><span>{label}</span><span className="badge badge-medium">{count}</span></div>) : <p className="setting-desc">No obvious PII patterns detected.</p>}</div>
    {findings.length > 0 && <div className="card mb-md"><div className="card-title flex-between"><span>Potential PII findings</span><button className="btn btn-secondary btn-sm" onClick={toggleAll}>{allSelected ? 'Unselect all' : 'Select all'}</button></div>{findings.map(f => <div className="setting-row" key={findingKey(f)}><div><div className="setting-name">{f.label} <span className="badge badge-medium">{f.confidenceLabel}</span></div><div className="setting-desc">Masked preview: <span className="mono">{f.maskedValue}</span> · {f.detectionMethod} · {f.reason}</div></div><input type="checkbox" checked={selected[findingKey(f)] !== false} onChange={() => toggle(f)} aria-label={`Mask ${f.label}`} /></div>)}</div>}
    <div className="card"><div className="card-title">Sanitized text preview</div><pre style={{whiteSpace:'pre-wrap', maxHeight:260, overflow:'auto', color:'var(--text-secondary)', fontFamily:'var(--font-mono)', fontSize:12}}>{sanitizedText || '(No extracted text)'}</pre></div>
  </div></>;
}
