# PII Shield Project Status

Updated: 2026-10-25

## Completed and verified

- Electron + React/Vite application builds with `npm run build`.
- TXT, selectable PDF, PNG, and JPG extraction modules are wired into the scan workflow.
- PDF.js worker is bundled by Vite; OCR remains local to Tesseract.js at runtime.
- Heuristic detection covers Aadhaar-like, PAN-like, Indian phone, email, driving licence, credit-card (Luhn), passport, and DOB candidates.
- Findings include offsets, masked previews, detection method, confidence, reason, and page field.
- Detection Results displays extraction status, warnings, grouped findings, heuristic risk, and sanitized preview.
- Selective masking and redacted TXT download are implemented.
- History stores metadata/count/risk only; extracted text and raw PII are not persisted.
- electron-builder configuration and architecture-aware DMG script are present.

## Known limitations

- Detection is pattern matching and does not prove identity or legal compliance.
- PDF extraction handles selectable text only; scanned PDFs need image OCR separately.
- OCR language data may be fetched by Tesseract.js on first use; this was not converted to an offline asset bundle.
- Secure PDF redaction export is not implemented. TXT export is the supported redaction artifact; visual PDF overlays are intentionally not claimed.
- DMG signing/notarization depends on Apple Developer credentials and is not configured.

## Verification

- `npm run test`: 56 passed, 0 failed.
- `npm run build`: passed; PDF worker included in `dist/renderer/assets`.
- Installer: run `npm run dist:mac`; output is written under `dist/` for the current host architecture.

## Latest commit

See `git log -1 --oneline` after the next commit. Keep this file updated after packaging.
