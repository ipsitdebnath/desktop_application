import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Image,
  FileType2,
  X,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';

const ACCEPTED = {
  'text/plain':      '.txt',
  'application/pdf': '.pdf',
  'image/png':       '.png',
  'image/jpeg':      '.jpg',
};
const ACCEPTED_EXTS = ['.txt', '.pdf', '.png', '.jpg', '.jpeg'];

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

export default function ScanDocument({ onNavigate, toast }) {
  const [file, setFile] = useState(null);       // { name, size, ext, path? }
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // ── validate extension ───────────────────────────
  const accept = useCallback((name, size, ext, extra) => {
    if (!ACCEPTED_EXTS.includes(ext)) {
      setError(`Unsupported file type: ${ext}`);
      toast?.('Unsupported file type', 'error');
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
    accept(f.name, f.size, ext);
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
    accept(result.name, result.size, result.ext, { path: result.path });
  }, [accept]);

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
          className={`upload-zone fade-up${dragOver ? ' drag-over' : ''}`}
          onClick={openNativeDialog}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="upload-icon"><Upload /></div>
          <div className="upload-title">Drop a file here or click to browse</div>
          <div className="upload-sub">Supports text documents, PDFs, and images</div>
          <div className="format-pills">
            <span className="format-pill">.TXT</span>
            <span className="format-pill">.PDF</span>
            <span className="format-pill">.PNG</span>
            <span className="format-pill">.JPG</span>
          </div>
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
                <span>{file.ext.toUpperCase().replace('.', '')} file</span>
                {file.path && <span className="mono" style={{ opacity: .5 }}>{file.path}</span>}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Scan button (disabled until detection engine exists) ─ */}
        {file && (
          <div className="mt-md fade-up" style={{ animationDelay: '.1s' }}>
            <button className="btn btn-primary" disabled title="PII detection will be implemented on Day 2">
              Scan for PII (coming soon)
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Document parsing, text extraction, and PII detection will be added in the next build.
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
