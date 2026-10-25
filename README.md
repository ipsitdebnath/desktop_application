# PII Shield: Government ID & Personal Information Detection System

PII Shield is a desktop application built with Electron, React, and Vite designed to detect and redact personally identifiable information (PII) embedded in documents and text.

## Features
- **Secure Desktop Architecture**: Electron desktop application configured with `contextIsolation` enabled and `nodeIntegration` disabled.
- **Cybersecurity Dark UI**: Dark navy theme (`#080E1A`), cyan/teal accents, responsive typography, and animated status badges.
- **Navigation Sidebar**: Persistent navigation for Dashboard, Scan Document, Detection Results, Scan History, and Settings. Collapses to icon-only on narrow viewports.
- **Metrics Overview**: Summary statistics for Documents Scanned, PII Detected, Risk Level, and Last Scan.
- **Document extraction**: Local TXT reading, selectable PDF extraction with page warnings, and PNG/JPG OCR.
- **PII detection**: Heuristic Aadhaar-like, PAN-like, phone, email, driving licence, credit-card, passport, and DOB candidate detection with offsets, masking, confidence, and explanations.
- **Redaction**: Select findings, preview sanitized text, and download a redacted TXT file.
- **Drag-and-Drop Uploader**: Document upload zone accepting PDF, TXT, PNG, and JPG files with file size and type validation.
- **File Metadata Display**: Selected file card shows filename, size, type, and path with clear/replace functionality.
- **Scan History**: Persistent history via Electron IPC (falls back to localStorage in browser). Clear all functionality included.
- **Settings Persistence**: Detection pattern toggles and file size limits saved to localStorage with save/reset controls.
- **Toast Notifications**: Auto-dismissing success/error/info toasts for user feedback.
- **Responsive Layout**: Sidebar collapses to icon-only below 900px; grid layouts adapt for smaller screens.
- **Local-First Privacy**: Local processing architecture without unauthorized external uploads.

## Tech Stack
- **Desktop Runtime**: Electron (with secure preload bridge)
- **Frontend Framework**: React 19 + Vite
- **Styling**: Vanilla CSS with modern cybersecurity theme
- **Icons**: Lucide React
- **Document Processing**: Tesseract.js (OCR) & PDF.js (PDF parsing)
- **Packaging**: electron-builder DMG packaging for the current macOS architecture

## Project Structure
```
PII Shield/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── main.js             # Window creation, IPC handlers
│   │   └── preload.js          # Safe contextBridge API
│   └── renderer/               # React frontend
│       ├── index.html           # HTML entry point
│       ├── main.jsx             # React root
│       ├── App.jsx              # App shell with page routing
│       ├── components/
│       │   ├── Sidebar.jsx      # Navigation sidebar
│       │   └── Toast.jsx        # Notification toasts
│       ├── pages/
│       │   ├── Dashboard.jsx    # Home with stat cards & quick actions
│       │   ├── ScanDocument.jsx # Drag-and-drop file upload
│       │   ├── DetectionResults.jsx # PII findings (empty state for Day 1)
│       │   ├── ScanHistory.jsx  # Persistent scan history
│       │   └── Settings.jsx     # Detection pattern config
│       └── styles/
│           └── index.css        # Global stylesheet & design system
├── package.json
├── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
cd "PII Shield"
npm install
```

### Running Locally

Launch both the Vite development server and the Electron application:
```bash
npm run dev
```

Run only the renderer Vite dev server (opens in browser at http://localhost:5173):
```bash
npm run dev:renderer
```

Run Electron pointing to the running dev server:
```bash
npm run dev:electron
```

### Building for Production
```bash
npm run build
npm start
```

Run the synthetic detector tests with `npm test`. Build an unsigned DMG for the current Mac architecture with `npm run dist:mac`; the artifact is emitted in `dist/`.

PDF export is intentionally not advertised: visual overlays can leave the original text recoverable. The supported safe export in this submission is redacted TXT.

## Security Model
- **contextIsolation**: `true` — renderer cannot access Node.js APIs directly
- **nodeIntegration**: `false` — no `require()` available in renderer code
- **Preload bridge**: exposes only `openFile`, `loadHistory`, `saveHistory`, `clearHistory` via `contextBridge`
- **Local processing**: no file contents are transmitted to external servers

## Roadmap
| Milestone | Status | Features |
|-----------|--------|----------|
| UI and desktop shell | ✅ Complete | Dashboard, file upload, navigation, settings, history |
| Detection and extraction | ✅ Complete | PDF text extraction, OCR, PII pattern matching |
| Redaction and export | ✅ Complete | Selective redacted TXT; secure PDF redaction not included |

## License
ISC
