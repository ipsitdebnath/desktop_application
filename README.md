# PII Shield: Government ID & Personal Information Detection System

PII Shield is a desktop application built with Electron, React, and Vite designed to detect and redact personally identifiable information (PII) embedded in documents and text.

## Features (Day 1 Milestone)
- **Secure Desktop Architecture**: Electron desktop application configured with `contextIsolation` enabled and `nodeIntegration` disabled.
- **Cybersecurity Dark UI**: Dark navy theme (`#080E1A`), cyan/teal accents, responsive typography, and animated status badges.
- **Navigation Sidebar**: Persistent navigation for Dashboard, Scan Document, Detection Results, Scan History, and Settings.
- **Metrics Overview**: Summary statistics for Documents Scanned, PII Detected, and Risk Level.
- **Drag-and-Drop Uploader**: Document upload zone accepting PDF, TXT, PNG, and JPG files with file size and type validation.
- **Local-First Privacy**: Local processing architecture without unauthorized external uploads.

## Tech Stack
- **Desktop Runtime**: Electron
- **Frontend Framework**: React 19 + Vite
- **Styling**: Vanilla CSS with modern cybersecurity theme
- **Icons**: Lucide React
- **Document Processing**: Tesseract.js (OCR) & PDF.js (PDF parsing)

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
npm install
```

### Running Locally
To launch both the Vite development server and the Electron application:
```bash
npm run dev
```

To run only the renderer Vite dev server:
```bash
npm run dev:renderer
```

To run Electron pointing to the running dev server:
```bash
npm run dev:electron
```
