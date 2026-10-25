import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Image,
  FileType2,
  X,
  HardDrive,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { extractDocument } from '../../services/documentExtractor.js';
import { classifyRisk, detectPII } from '../../services/piiDetector.js';

const ACCEPTED = {
  'text/plain':      '.txt',
  'application/pdf': '.pdf',
  'image/png':       '.png',
  'image/jpeg':      '.jpg',
};
const ACCEPTED_EXTS = ['.txt', '.pdf', '.png', '.jpg', '.jpeg'];

function getMaxFileSizeMB() {
  try {
    const raw = localStorage.getItem('pii-shield-settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (s.maxFileSizeMB && s.maxFileSizeMB > 0) return s.maxFileSizeMB;
    }
  } catch { /* ignore */ }
  return 50; // default 50 MB
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function extIcon(ext) {
  if (ext === '.pdf') return <FileType2 />;
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return <Image />;
  return <FileText />;
}

function extLabel(ext) {
  const map = { '.txt': 'Text', '.pdf': 'PDF', '.png': 'PNG Image', '.jpg': 'JPEG Image', '.jpeg': 'JPEG Image' };
  return map[ext] || ext.toUpperCase().replace('.', '');
}

export default function ScanDocument({ onNavigate, toast, onScanComplete }) {
  const [file, setFile] = useState(null);       // { name, size, ext, path? }
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  // ── validate extension & size ─────────────────────
  const accept = useCallback((name, size, ext, extra) => {
    if (!ACCEPTED_EXTS.includes(ext)) {
      const msg = `Unsupported file type "${ext}". Please use TXT, PDF, PNG, or JPG.`;
      setError(msg);
      toast?.(msg, 'error');
      return;
    }
    const maxMB = getMaxFileSizeMB();
    const maxBytes = maxMB * 1024 * 1024;
    if (size > maxBytes) {
      const msg = `File too large (${formatBytes(size)}). Maximum is ${maxMB} MB.`;
      setError(msg);
      toast?.(msg, 'error');
      return;
    }
    setError('');
    setFile({ name, size, ext, ...extra });
    toast?.(`Selected: ${name}`, 'success');
  }, [toast]);

  // ── file input handler ───────────────────────────
  const onInputChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    accept(f.name, f.size, ext, { browserFile: f });
    e.target.value = '';   // allow re-selecting same file
  }, [accept]);

  // ── drag-and-drop handlers ───────────────────────
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    accept(f.name, f.size, ext);
  }, [accept]);

  // ── native dialog (Electron) ─────────────────────
  const openNativeDialog = useCallback(async () => {
    if (!window.electronAPI?.openFile) {
      // Fallback: trigger hidden <input>
      inputRef.current?.click();
      return;
    }
    const result = await window.electronAPI.openFile();
    if (result.canceled) return;
    const contents = await window.electronAPI.readFile(result.path);
    if (!contents?.success) { setError(contents?.error || 'Unable to read selected file.'); return; }
    const browserFile = new File([contents.data], result.name);
    accept(result.name, result.size, result.ext, { path: result.path, browserFile });
  }, [accept]);

  const scan = useCallback(async () => {
    if (!file?.browserFile || scanning) return;
    setScanning(true); setError(''); setProgress(0);
    try {
      const extraction = await extractDocument(file.browserFile, file.ext, setProgress);
      if (!extraction.success) throw new Error(extraction.error || 'Document extraction failed.');
      const settings = JSON.parse(localStorage.getItem('pii-shield-settings') || '{}');
      const findings = detectPII(extraction.text, { enabledPatterns: settings.detectionPatterns });
      onScanComplete?.({ file: { name: file.name, size: file.size, ext: file.ext }, extraction, findings, risk: classifyRisk(findings), timestamp: new Date().toISOString() });
      toast?.(`Scan complete: ${findings.length} potential finding(s)`, findings.length ? 'info' : 'success');
    } catch (err) {
      setError(err.message || 'Scan failed.');
      toast?.(err.message || 'Scan failed.', 'error');
    } finally { setScanning(false); }
  }, [file, scanning, onScanComplete, toast]);

  const clearFile = () => { setFile(null); setError(''); };

  return (
    <>
      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Scan Document</h1>
          <p className="page-header-sub">Upload a file to scan for personally identifiable information</p>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Upload zone ────────────────────────────── */}
        <div
          className={`upload-zone fade-up${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
          onClick={file ? undefined : openNativeDialog}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {!file ? (
            <>
              <div className="upload-icon"><Upload /></div>
              <div className="upload-title">Drop a file here or click to browse</div>
              <div className="upload-sub">Supports text documents, PDFs, and images (max {getMaxFileSizeMB()} MB)</div>
              <div className="format-pills">
                <span className="format-pill">.TXT</span>
                <span className="format-pill">.PDF</span>
                <span className="format-pill">.PNG</span>
                <span className="format-pill">.JPG</span>
              </div>
            </>
          ) : (
            <div className="upload-success">
              <CheckCircle size={24} />
              <span>File selected — drop a different file to replace</span>
            </div>
          )}
          {/* Hidden input as fallback when not running in Electron */}
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={onInputChange}
          />
        </div>

        {/* ── Error ──────────────────────────────────── */}
        {error && (
          <div className="alert alert-warning mt-md fade-up">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        {/* ── Selected file card ─────────────────────── */}
        {file && (
          <div className="file-card fade-up" style={{ animationDelay: '.05s' }}>
            <div className="file-card-icon">{extIcon(file.ext)}</div>
            <div className="file-card-body">
              <div className="file-card-name">{file.name}</div>
              <div className="file-card-meta">
                <span><HardDrive size={13} /> {formatBytes(file.size)}</span>
                <span>{extLabel(file.ext)}</span>
                {file.path && <span className="mono" style={{ opacity: .5 }}>{file.path}</span>}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Scan button ────────────────────────────── */}
        {file && (
          <div className="mt-md fade-up" style={{ animationDelay: '.1s' }}>
            <button className="btn btn-primary" disabled={scanning} onClick={scan}>
              {scanning ? `Scanning… ${progress}%` : 'Scan for PII'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Text, PDF, and image contents are processed locally. Extraction warnings are shown with the results.
            </p>
          </div>
        )}

        {/* ── Info ───────────────────────────────────── */}
        <div className="alert alert-info mt-lg fade-up fade-up-d2">
          <HardDrive />
          <div>
            <strong>Local processing:</strong> All documents are processed entirely on your machine.
            No file contents are ever sent to an external server.
          </div>
        </div>
      </div>
    </>
  );
}
