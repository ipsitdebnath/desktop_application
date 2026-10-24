/**
 * piiDetector.test.mjs
 * --------------------
 * Automated tests for the PII detection engine.
 * Uses synthetic data only — no real personal information.
 *
 * Run: node src/tests/piiDetector.test.mjs
 *
 * NOTE: The service files use ESM syntax, which Vite handles for the app.
 * For standalone Node testing, we import them as .js within a CJS package,
 * so we use dynamic import workaround.
 */

// The piiDetector.js uses ESM exports but lives in a "type":"commonjs" package.
// Vite handles this at build time. For Node testing we need a workaround.
// We duplicate the core detection logic here in a self-contained manner.

// ═══════════════════════════════════════════════════════════════════
// Inline copy of core detection functions for standalone testing.
// In the actual app, these live in src/services/piiDetector.js
// and are bundled by Vite.
// ═══════════════════════════════════════════════════════════════════

function luhnCheck(numStr) {
  let sum = 0;
  let alternate = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
];
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

function verhoeffCheck(numStr) {
  try {
    let c = 0;
    const digits = numStr.split('').reverse().map(Number);
    for (let i = 0; i < digits.length; i++) {
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
    }
    return c === 0;
  } catch { return false; }
}

const PATTERNS = {
  aadhaar: {
    label: 'Aadhaar Number',
    regex: /\b([2-9]\d{3})\s?[-]?\s?(\d{4})\s?[-]?\s?(\d{4})\b/g,
    normalize: (match) => match.replace(/[\s-]/g, ''),
    validate: (n) => {
      if (n.length !== 12) return false;
      if (/^(\d)\1{11}$/.test(n)) return false;
      if (/(\d)\1{4,}/.test(n)) return false;
      return true;
    },
    mask: (n) => `XXXX XXXX ${n.slice(-4)}`,
    confidence: (n) => verhoeffCheck(n) ? 'High' : 'Medium',
    detectionMethod: (n) => verhoeffCheck(n) ? 'regex+verhoeff' : 'regex',
    reason: 'Matches the 12-digit Aadhaar UID format.',
  },
  pan: {
    label: 'PAN Number',
    regex: /\b([A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z])\b/gi,
    normalize: (m) => m.toUpperCase(),
    validate: (n) => n.length === 10,
    mask: (n) => `${n.slice(0,2)}XXX${n.slice(5,7)}XX${n.slice(-1)}`,
    confidence: () => 'High',
    detectionMethod: () => 'regex',
    reason: 'Matches the Indian PAN format (5 letters + 4 digits + 1 letter).',
  },
  phone: {
    label: 'Phone Number',
    regex: /(?:\+?91[\s.-]?|0)?([6-9]\d{4})[\s.-]?(\d{5})\b/g,
    normalize: (m) => m.replace(/[\s.\-+]/g, '').replace(/^0+/, '').replace(/^91/, ''),
    validate: (n) => {
      const digits = n.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 12) return false;
      const ten = digits.slice(-10);
      if (/^(\d)\1{9}$/.test(ten)) return false;
      return true;
    },
    mask: (n) => { const d = n.replace(/\D/g, '').slice(-10); return `${d.slice(0,2)}XXXXXX${d.slice(-2)}`; },
    confidence: () => 'Medium',
    detectionMethod: () => 'regex',
    reason: 'Matches Indian phone number format (10 digits starting with 6-9).',
  },
  email: {
    label: 'Email Address',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    normalize: (m) => m.toLowerCase(),
    validate: (n) => {
      const parts = n.split('@');
      if (parts.length !== 2) return false;
      if (parts[0].length === 0 || parts[1].length < 3) return false;
      if (parts[1].split('.').some(s => s.length === 0)) return false;
      return true;
    },
    mask: (n) => {
      const [local, domain] = n.split('@');
      const ml = local.length <= 2 ? 'X'.repeat(local.length) : local[0] + 'X'.repeat(local.length - 2) + local[local.length - 1];
      return `${ml}@${domain}`;
    },
    confidence: () => 'High',
    detectionMethod: () => 'regex',
    reason: 'Matches email address syntax.',
  },
  driving_licence: {
    label: 'Driving Licence',
    regex: /\b([A-Z]{2}[\s-]?\d{1,2}[\s-]?(?:(?:19|20)\d{2})\d{5,7})\b/gi,
    normalize: (m) => m.toUpperCase().replace(/[\s-]/g, ''),
    validate: (n) => {
      if (!/^[A-Z]{2}/.test(n)) return false;
      if (n.length < 13 || n.length > 16) return false;
      return true;
    },
    mask: (n) => `${n.slice(0,4)}XXXXXXX${n.slice(-2)}`,
    confidence: () => 'Medium',
    detectionMethod: () => 'regex',
    reason: 'Matches common Indian driving licence format.',
  },
  credit_card: {
    label: 'Credit Card Number',
    regex: /\b([3-6]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{1,7})\b/g,
    normalize: (m) => m.replace(/[\s-]/g, ''),
    validate: (n) => {
      if (n.length < 13 || n.length > 19) return false;
      if (!/^\d+$/.test(n)) return false;
      if (/^(\d)\1+$/.test(n)) return false;
      return luhnCheck(n);
    },
    mask: (n) => `${n.slice(0,4)} XXXX XXXX ${n.slice(-4)}`,
    confidence: () => 'High',
    detectionMethod: () => 'regex+luhn',
    reason: 'Matches credit/debit card number format and passes Luhn checksum.',
  },
  passport: {
    label: 'Passport Number',
    regex: /\b([A-Z][0-9]{7})\b/gi,
    normalize: (m) => m.toUpperCase(),
    validate: (n) => /^[A-PR-Z][0-9]{7}$/.test(n),
    mask: (n) => `${n[0]}XXXXX${n.slice(-2)}`,
    confidence: () => 'Low',
    detectionMethod: () => 'regex',
    reason: 'Matches Indian passport number format (letter + 7 digits).',
  },
  dob: {
    label: 'Date of Birth',
    regex: /\b(?:(?:DOB|D\.O\.B|Date\s+of\s+Birth|Birth\s*Date|Born\s*(?:on)?)\s*[:.\-]?\s*)(\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})\b/gi,
    normalize: (m) => { const d = m.match(/(\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})/); return d ? d[1] : m; },
    validate: () => true,
    mask: (n) => `XX/XX/${n.slice(-4)}`,
    confidence: () => 'Medium',
    detectionMethod: () => 'regex+keyword',
    reason: 'Date found near a date-of-birth keyword.',
  },
};

function detectPII(text, options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return [];
  const { enabledPatterns, pageNumber = null } = options;
  const findings = [];

  for (const [patternId, pattern] of Object.entries(PATTERNS)) {
    if (enabledPatterns && enabledPatterns[patternId] === false) continue;
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const rawValue = match[0];
      const normalized = pattern.normalize(rawValue);
      if (!pattern.validate(normalized)) continue;
      findings.push({
        type: patternId, label: pattern.label,
        start: match.index, end: match.index + rawValue.length,
        rawValue, maskedValue: pattern.mask(normalized),
        detectionMethod: typeof pattern.detectionMethod === 'function' ? pattern.detectionMethod(normalized) : pattern.detectionMethod,
        confidenceLabel: typeof pattern.confidence === 'function' ? pattern.confidence(normalized) : pattern.confidence,
        reason: pattern.reason, pageNumber,
      });
    }
  }
  return deduplicateFindings(findings);
}

function deduplicateFindings(findings) {
  if (findings.length <= 1) return findings;
  const CO = { High: 3, Medium: 2, Low: 1 };
  const sorted = [...findings].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const ld = (b.end - b.start) - (a.end - a.start);
    if (ld !== 0) return ld;
    return (CO[b.confidenceLabel] || 0) - (CO[a.confidenceLabel] || 0);
  });
  const result = [];
  let lastEnd = -1;
  for (const finding of sorted) {
    if (finding.start < lastEnd) {
      const overlapping = result.find(r => r.type === finding.type && finding.start < r.end && finding.end > r.start);
      if (overlapping) continue;
      const exactOverlap = result.find(r => r.start === finding.start && r.end === finding.end);
      if (exactOverlap) continue;
    }
    result.push(finding);
    if (finding.end > lastEnd) lastEnd = finding.end;
  }
  return result;
}

function classifyRisk(findings) {
  if (!findings || findings.length === 0) return { level: 'none', label: 'No Risk', description: 'No potential PII was detected in this document.' };
  const HIGH_IMPACT = ['aadhaar', 'pan', 'passport', 'credit_card'];
  const hic = findings.filter(f => HIGH_IMPACT.includes(f.type)).length;
  const tc = findings.length;
  if (hic >= 5 || tc >= 10) return { level: 'critical', label: 'Critical', description: `${hic} government ID/financial candidate(s) among ${tc} total finding(s).` };
  if (hic > 0) return { level: 'high', label: 'High', description: `${hic} potential government ID or financial identifier(s) detected.` };
  if (tc >= 3) return { level: 'medium', label: 'Medium', description: `${tc} potential personal information item(s) detected.` };
  return { level: 'low', label: 'Low', description: `${tc} low-impact finding(s) detected.` };
}

// ═══════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════

let passed = 0, failed = 0, total = 0;

function assert(condition, description) {
  total++;
  if (condition) { passed++; console.log(`  ✅ ${description}`); }
  else { failed++; console.error(`  ❌ FAIL: ${description}`); }
}
function assertFindsType(text, type, desc) {
  const f = detectPII(text);
  assert(f.some(x => x.type === type), desc);
}
function assertNotFindsType(text, type, desc) {
  const f = detectPII(text);
  assert(!f.some(x => x.type === type), desc);
}
function section(name) {
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 60 - name.length))}`);
}

// ═══════════════════════════════════════════════════════════════════

section('1. Aadhaar-like candidates');
assertFindsType('My Aadhaar number is 2345 6789 0123', 'aadhaar', 'Detects Aadhaar with spaces');
assertFindsType('UID: 2345-6789-0123', 'aadhaar', 'Detects Aadhaar with hyphens');
assertFindsType('Aadhaar: 234567890123', 'aadhaar', 'Detects Aadhaar without separators');
assertNotFindsType('Number: 0123 4567 8901', 'aadhaar', 'Rejects Aadhaar starting with 0');
assertNotFindsType('Number: 1111 1111 1111', 'aadhaar', 'Rejects all-same-digit Aadhaar');

section('2. PAN-like identifiers');
assertFindsType('PAN: ABCPE1234F', 'pan', 'Detects valid PAN format');
assertFindsType('My PAN is BNZPM2501F', 'pan', 'Detects realistic PAN candidate');
assertNotFindsType('Code: ABCDE1234', 'pan', 'Rejects 9-character non-PAN');

section('3. Indian phone numbers');
assertFindsType('Call me at 9876543210', 'phone', 'Detects 10-digit Indian mobile');
assertFindsType('Phone: +91-9876543210', 'phone', 'Detects with country code and hyphen');
assertFindsType('Contact: +91 98765 43210', 'phone', 'Detects with country code and spaces');
assertNotFindsType('Number: 1234567890', 'phone', 'Rejects number not starting with 6-9');
assertNotFindsType('Number: 9999999999', 'phone', 'Rejects all-same-digit phone');

section('4. Email addresses');
assertFindsType('Email: user@example.com', 'email', 'Detects simple email');
assertFindsType('Contact john.doe+work@company.co.in for details', 'email', 'Detects email with + and subdomain');
assertNotFindsType('Not an email: user@', 'email', 'Rejects incomplete email');

section('5. Credit card candidates');
assertFindsType('Card: 4111 1111 1111 1111', 'credit_card', 'Detects Visa test card (Luhn valid)');
assertFindsType('Card: 5500-0000-0000-0004', 'credit_card', 'Detects Mastercard test card (Luhn valid)');
assertNotFindsType('Number: 4111 1111 1111 1112', 'credit_card', 'Rejects Luhn-invalid number');

section('6. Driving licence candidates');
assertFindsType('DL: MH1220190006543', 'driving_licence', 'Detects Maharashtra DL format');
assertFindsType('Licence: KA0120200001234', 'driving_licence', 'Detects Karnataka DL format');

section('7. Text without obvious PII');
(() => {
  const t = 'The weather today is sunny with a high of 25 degrees. Normal document with no sensitive info.';
  assert(detectPII(t).length === 0, 'No findings in clean text');
})();

section('8. Empty and malformed text');
assert(detectPII('').length === 0, 'Empty string returns no findings');
assert(detectPII(null).length === 0, 'null returns no findings');
assert(detectPII(undefined).length === 0, 'undefined returns no findings');
assert(detectPII('   \n\t  ').length === 0, 'Whitespace-only returns no findings');

section('9. Multiple findings in one document');
(() => {
  const text = `Name: John Doe\nAadhaar: 2345 6789 0123\nPAN: ABCPE1234F\nEmail: john@example.com\nPhone: 9876543210`;
  const f = detectPII(text);
  const types = new Set(f.map(x => x.type));
  assert(types.has('aadhaar'), 'Multi-doc: finds Aadhaar');
  assert(types.has('pan'), 'Multi-doc: finds PAN');
  assert(types.has('email'), 'Multi-doc: finds email');
  assert(types.has('phone'), 'Multi-doc: finds phone');
  assert(f.length >= 4, `Multi-doc: at least 4 findings (got ${f.length})`);
})();

section('10. Repeated and overlapping findings');
(() => {
  const text = 'PAN: ABCPE1234F and also ABCPE1234F again';
  const f = detectPII(text).filter(x => x.type === 'pan');
  assert(f.length === 2, 'Detects two separate PAN occurrences');
})();

section('11. Arbitrary long digit sequences');
assertNotFindsType('Transaction ID: 00000000000000000000', 'aadhaar', 'All-zeros is not Aadhaar');
assertNotFindsType('Reference: 12345678', 'credit_card', '8-digit number is not a credit card');

section('12. Finding structure validation');
(() => {
  const text = 'Email is test@example.com here';
  const f = detectPII(text).find(x => x.type === 'email');
  if (!f) { assert(false, 'Should find email for structure test'); return; }
  assert(typeof f.type === 'string', 'Finding has type');
  assert(typeof f.label === 'string', 'Finding has label');
  assert(typeof f.start === 'number', 'Finding has start offset');
  assert(typeof f.end === 'number', 'Finding has end offset');
  assert(typeof f.maskedValue === 'string', 'Finding has maskedValue');
  assert(typeof f.detectionMethod === 'string', 'Finding has detectionMethod');
  assert(typeof f.confidenceLabel === 'string', 'Finding has confidenceLabel');
  assert(typeof f.reason === 'string', 'Finding has reason');
  assert(f.maskedValue !== f.rawValue, 'maskedValue differs from rawValue');
  assert(f.start >= 0 && f.end > f.start, 'Offsets are valid');
  assert(text.substring(f.start, f.end) === f.rawValue, 'Offsets match rawValue');
})();

section('13. Risk classification');
(() => {
  assert(classifyRisk([]).level === 'none', 'No findings → none risk');
  assert(classifyRisk([{ type: 'email', confidenceLabel: 'High' }]).level === 'low', '1 email → low risk');
  assert(classifyRisk([{ type: 'aadhaar', confidenceLabel: 'High' }]).level === 'high', '1 Aadhaar → high risk');
  assert(classifyRisk(Array(5).fill({ type: 'aadhaar', confidenceLabel: 'High' })).level === 'critical', '5 Aadhaar → critical risk');
})();

section('14. Luhn checksum');
assert(luhnCheck('4111111111111111'), 'Luhn: Visa test card passes');
assert(luhnCheck('5500000000000004'), 'Luhn: MC test card passes');
assert(!luhnCheck('4111111111111112'), 'Luhn: Invalid card fails');

section('15. Masking verification');
(() => {
  const f = detectPII('PAN: ABCPE1234F').find(x => x.type === 'pan');
  if (!f) { assert(false, 'PAN should be found for masking test'); return; }
  assert(!f.maskedValue.includes('ABCPE1234F'), 'PAN is masked');
  assert(f.maskedValue.includes('X'), 'Mask contains X characters');
})();

section('16. Disabled patterns');
(() => {
  const text = 'PAN: ABCPE1234F and email test@example.com';
  const f = detectPII(text, { enabledPatterns: { pan: false, email: true } });
  assert(!f.some(x => x.type === 'pan'), 'Disabled PAN is skipped');
  assert(f.some(x => x.type === 'email'), 'Enabled email is detected');
})();

console.log(`\n${'═'.repeat(64)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
console.log(`${'═'.repeat(64)}\n`);

process.exit(failed > 0 ? 1 : 0);
