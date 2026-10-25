# Submission Checklist

| Requirement | Status | Evidence / note |
|---|---|---|
| Existing history preserved | COMPLETED | Existing commits retained; no history rewrite |
| TXT extraction | COMPLETED | `src/services/documentExtractor.js` |
| PDF extraction | COMPLETED | `src/services/pdfExtractor.js`; selectable text, warnings |
| PNG/JPG OCR | COMPLETED | `src/services/imageExtractor.js`; runtime language-data limitation |
| PII detection | COMPLETED | `src/services/piiDetector.js`; heuristic only |
| Risk classification | COMPLETED | Detector + Detection Results |
| Redacted TXT export | COMPLETED | Selective masking in Detection Results |
| Secure PDF redaction | BLOCKED | Not safe to claim within deadline |
| Dashboard/history integration | COMPLETED | App scan state + metadata-only history |
| Automated detector tests | COMPLETED | `npm run test` — 56/56 |
| Production renderer build | COMPLETED | `npm run build` passed |
| macOS DMG | COMPLETED | `dist/PII Shield-1.0.0-arm64.dmg`, 165 MB; mounted and app launch process verified |
| Packaged interactive TXT scan | BLOCKED | UI automation cannot access Assistive Access on this host |
| Signing/notarization | NOT STARTED | No credentials/configuration supplied; artifact is unsigned |
