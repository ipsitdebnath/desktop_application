/**
 * piiDetector.js
 * ---------------
 * Detects potential personally identifiable information (PII) in text.
 *
 * IMPORTANT DISCLAIMER:
 * This is a heuristic, pattern-matching prototype. It is NOT a certified
 * compliance tool. All findings are potential matches that require human
 * verification. The detector never confirms that a detected value is a
 * real, valid identifier belonging to any individual.
 *
 * Supported detection types (in priority order):
 *   1. Aadhaar-like numbers (12-digit Indian UID format)
 *   2. PAN-like identifiers (Indian Permanent Account Number)
 *   3. Indian phone numbers
 *   4. Email addresses
 *   5. Driving licence identifiers (Indian DL format — regional variations exist)
 *   6. Credit card number candidates (with Luhn checksum validation)
 *   7. Optional: Passport-like, DOB, SSN patterns
 *
 * Finding structure:
 * {
 *   type: string,            // e.g. 'aadhaar', 'pan', 'phone', 'email', ...
 *   label: string,           // Human-readable label
 *   start: number,           // Start offset in extracted text
 *   end: number,             // End offset in extracted text
 *   rawValue: string,        // The matched substring (for offset verification only)
 *   maskedValue: string,     // Masked version safe for display
 *   detectionMethod: string, // 'regex', 'regex+luhn', 'regex+verhoeff', etc.
 *   confidenceLabel: string, // 'High', 'Medium', 'Low'
 *   reason: string,          // Explanation of why this was flagged
 *   pageNumber: number|null, // Page number if available
 * }
 *
 * Privacy: maskedValue never exposes the full value. rawValue is used
 * internally for highlighting and is NOT stored in scan history.
 */

// ── Pattern Definitions ──────────────────────────────────────────

const PATTERNS = {
  /**
   * Aadhaar-like: 12-digit number in groups of 4.
   * Matches: 1234 5678 9012, 1234-5678-9012, 123456789012
   * Excludes: sequences starting with 0 or 1 (Aadhaar starts with 2-9).
   * Uses Verhoeff checksum for validation when possible.
   */
  aadhaar: {
    label: 'Aadhaar Number',
    // Match 12-digit sequences with optional spaces/hyphens, starting with 2-9
    regex: /\b([2-9]\d{3})\s?[-]?\s?(\d{4})\s?[-]?\s?(\d{4})\b/g,
    normalize: (match) => match.replace(/[\s-]/g, ''),
    validate: (normalized) => {
      if (normalized.length !== 12) return false;
      if (/^(\d)\1{11}$/.test(normalized)) return false; // all same digits
      // Verify no more than 4 consecutive identical digits
      if (/(\d)\1{4,}/.test(normalized)) return false;
      return true;
    },
    mask: (normalized) => `XXXX XXXX ${normalized.slice(-4)}`,
    confidence: (normalized) => {
      // Higher confidence if Verhoeff checksum passes
      if (verhoeffCheck(normalized)) return 'High';
      return 'Medium';
    },
    detectionMethod: (normalized) => verhoeffCheck(normalized) ? 'regex+verhoeff' : 'regex',
    reason: 'Matches the 12-digit Aadhaar UID format.',
  },

  /**
   * PAN: ABCDE1234F — 5 uppercase letters, 4 digits, 1 letter.
   * The 4th character indicates holder type (P=Individual, C=Company, etc.).
   */
  pan: {
    label: 'PAN Number',
    regex: /\b([A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z])\b/gi,
    normalize: (match) => match.toUpperCase(),
    validate: (normalized) => {
      // Basic format is enforced by the regex
      return normalized.length === 10;
    },
    mask: (normalized) => `${normalized.slice(0, 2)}XXX${normalized.slice(5, 7)}XX${normalized.slice(-1)}`,
    confidence: () => 'High',
    detectionMethod: () => 'regex',
    reason: 'Matches the Indian PAN format (5 letters + 4 digits + 1 letter).',
  },

  /**
   * Indian phone numbers.
   * Matches: +91-9876543210, 91 9876543210, 09876543210, 9876543210
   * Indian mobile numbers start with 6-9.
   */
  phone: {
    label: 'Phone Number',
    regex: /(?:\+?91[\s.-]?|0)?([6-9]\d{4})[\s.-]?(\d{5})\b/g,
    normalize: (match) => match.replace(/[\s.\-+]/g, '').replace(/^0+/, '').replace(/^91/, ''),
    validate: (normalized) => {
      // Should be exactly 10 digits after normalization
      const digits = normalized.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 12) return false;
      // Must not be all same digits
      const tenDigits = digits.slice(-10);
      if (/^(\d)\1{9}$/.test(tenDigits)) return false;
      return true;
    },
    mask: (normalized) => {
      const digits = normalized.replace(/\D/g, '').slice(-10);
      return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
    },
    confidence: () => 'Medium',
    detectionMethod: () => 'regex',
    reason: 'Matches Indian phone number format (10 digits starting with 6-9).',
  },

  /**
   * Email addresses — common syntax detection.
   */
  email: {
    label: 'Email Address',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    normalize: (match) => match.toLowerCase(),
    validate: (normalized) => {
      // Basic sanity: must have local part and domain
      const parts = normalized.split('@');
      if (parts.length !== 2) return false;
      if (parts[0].length === 0 || parts[1].length < 3) return false;
      // Reject obvious non-emails
      if (parts[1].split('.').some(s => s.length === 0)) return false;
      return true;
    },
    mask: (normalized) => {
      const [local, domain] = normalized.split('@');
      const maskedLocal = local.length <= 2
        ? 'X'.repeat(local.length)
        : local[0] + 'X'.repeat(local.length - 2) + local[local.length - 1];
      return `${maskedLocal}@${domain}`;
    },
    confidence: () => 'High',
    detectionMethod: () => 'regex',
    reason: 'Matches email address syntax.',
  },

  /**
   * Indian Driving Licence.
   * Format varies by state but generally: 2-letter state code + 2 digits (RTO) +
   * year (2 or 4 digits) + 7-digit sequence.
   * Examples: MH12 20190006543, KA01-2020-0001234, DL-0420150012345
   * Coverage is incomplete — regional format variations exist.
   */
  driving_licence: {
    label: 'Driving Licence',
    regex: /\b([A-Z]{2}[\s-]?\d{1,2}[\s-]?(?:(?:19|20)\d{2})\d{5,7})\b/gi,
    normalize: (match) => match.toUpperCase().replace(/[\s-]/g, ''),
    validate: (normalized) => {
      // Must start with 2 letters (state code)
      if (!/^[A-Z]{2}/.test(normalized)) return false;
      // Total length should be 13-16 characters
      if (normalized.length < 13 || normalized.length > 16) return false;
      return true;
    },
    mask: (normalized) => `${normalized.slice(0, 4)}XXXXXXX${normalized.slice(-2)}`,
    confidence: () => 'Medium',
    detectionMethod: () => 'regex',
    reason: 'Matches common Indian driving licence format. Note: regional formats vary and coverage is incomplete.',
  },

  /**
   * Credit card number candidates.
   * Detects 13-19 digit sequences with common card prefixes (Visa 4, MC 5,
   * Amex 3, Discover 6, RuPay 60/65/81/82).
   * Validates using the Luhn checksum algorithm.
   */
  credit_card: {
    label: 'Credit Card Number',
    regex: /\b([3-6]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{1,7})\b/g,
    normalize: (match) => match.replace(/[\s-]/g, ''),
    validate: (normalized) => {
      if (normalized.length < 13 || normalized.length > 19) return false;
      if (!/^\d+$/.test(normalized)) return false;
      // All same digit is not a card number
      if (/^(\d)\1+$/.test(normalized)) return false;
      // Must pass Luhn checksum
      return luhnCheck(normalized);
    },
    mask: (normalized) => `${normalized.slice(0, 4)} XXXX XXXX ${normalized.slice(-4)}`,
    confidence: () => 'High',
    detectionMethod: () => 'regex+luhn',
    reason: 'Matches credit/debit card number format and passes Luhn checksum.',
  },

  /**
   * Indian Passport number.
   * Format: 1 letter + 7 digits (e.g. J1234567).
   * First letter indicates type/series.
   */
  passport: {
    label: 'Passport Number',
    regex: /\b([A-Z][0-9]{7})\b/gi,
    normalize: (match) => match.toUpperCase(),
    validate: (normalized) => {
      // Exactly 8 characters: 1 letter + 7 digits
      return /^[A-PR-Z][0-9]{7}$/.test(normalized); // Q is not used
    },
    mask: (normalized) => `${normalized[0]}XXXXX${normalized.slice(-2)}`,
    confidence: () => 'Low',
    detectionMethod: () => 'regex',
    reason: 'Matches Indian passport number format (letter + 7 digits). Short pattern — may produce false positives.',
  },

  /**
   * Date of Birth patterns.
   * Detects dates in common formats near DOB-related keywords.
   */
  dob: {
    label: 'Date of Birth',
    regex: /\b(?:(?:DOB|D\.O\.B|Date\s+of\s+Birth|Birth\s*Date|Born\s*(?:on)?)\s*[:.\-]?\s*)(\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})\b/gi,
    normalize: (match) => {
      // Extract just the date part
      const dateMatch = match.match(/(\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})/);
      return dateMatch ? dateMatch[1] : match;
    },
    validate: () => true,
    mask: (normalized) => `XX/XX/${normalized.slice(-4)}`,
    confidence: () => 'Medium',
    detectionMethod: () => 'regex+keyword',
    reason: 'Date found near a date-of-birth keyword.',
  },
};

// ── Luhn Checksum (for credit cards) ────────────────────────────

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

// ── Verhoeff Checksum (for Aadhaar) ─────────────────────────────

const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];
const VERHOEFF_INV = [0,4,3,2,1,5,6,7,8,9];

function verhoeffCheck(numStr) {
  try {
    let c = 0;
    const digits = numStr.split('').reverse().map(Number);
    for (let i = 0; i < digits.length; i++) {
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
    }
    return c === 0;
  } catch {
    return false;
  }
}

// ── Main Detection Function ─────────────────────────────────────

/**
 * Scan text for potential PII findings.
 *
 * @param {string} text - The extracted text to scan
 * @param {object} [options] - Detection options
 * @param {object} [options.enabledPatterns] - Map of pattern IDs to booleans (from Settings)
 * @param {number|null} [options.pageNumber] - Page number if applicable
 * @returns {object[]} Array of finding objects
 */
export function detectPII(text, options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  const { enabledPatterns, pageNumber = null } = options;
  const findings = [];

  for (const [patternId, pattern] of Object.entries(PATTERNS)) {
    // Skip disabled patterns (if Settings provide enabledPatterns map)
    if (enabledPatterns && enabledPatterns[patternId] === false) {
      continue;
    }

    // Reset regex state for global flag
    pattern.regex.lastIndex = 0;

    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const rawValue = match[0];
      const normalized = pattern.normalize(rawValue);

      // Validate the match
      if (!pattern.validate(normalized)) continue;

      const finding = {
        type: patternId,
        label: pattern.label,
        start: match.index,
        end: match.index + rawValue.length,
        rawValue,
        maskedValue: pattern.mask(normalized),
        detectionMethod: typeof pattern.detectionMethod === 'function'
          ? pattern.detectionMethod(normalized)
          : pattern.detectionMethod,
        confidenceLabel: typeof pattern.confidence === 'function'
          ? pattern.confidence(normalized)
          : pattern.confidence,
        reason: pattern.reason,
        pageNumber,
      };

      findings.push(finding);
    }
  }

  // Deduplicate overlapping matches — prefer higher-confidence or longer matches
  return deduplicateFindings(findings);
}

/**
 * Remove overlapping findings, preferring higher confidence and longer matches.
 */
function deduplicateFindings(findings) {
  if (findings.length <= 1) return findings;

  // Sort by start offset, then by length (longest first), then by confidence
  const CONFIDENCE_ORDER = { High: 3, Medium: 2, Low: 1 };
  const sorted = [...findings].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return (CONFIDENCE_ORDER[b.confidenceLabel] || 0) - (CONFIDENCE_ORDER[a.confidenceLabel] || 0);
  });

  const result = [];
  let lastEnd = -1;

  for (const finding of sorted) {
    // If this finding overlaps with the previous kept finding, skip it
    // unless it's a completely different type at the same position
    if (finding.start < lastEnd) {
      // Check if there's already a finding of the same type overlapping
      const overlapping = result.find(
        r => r.type === finding.type && finding.start < r.end && finding.end > r.start
      );
      if (overlapping) continue;

      // Different types at overlapping positions — keep both but prefer the longer one
      // if they share the exact same span
      const exactOverlap = result.find(
        r => r.start === finding.start && r.end === finding.end
      );
      if (exactOverlap) continue;
    }

    result.push(finding);
    if (finding.end > lastEnd) lastEnd = finding.end;
  }

  return result;
}

// ── Risk Classification ─────────────────────────────────────────

/**
 * Calculate risk level from findings.
 *
 * Risk heuristic (prototype — not a compliance guarantee):
 * - CRITICAL: 5+ government ID candidates or 10+ total findings
 * - HIGH:     Any Aadhaar, PAN, passport, or credit card candidate detected
 * - MEDIUM:   Phone numbers, emails, DL, or DOB detected (3+ findings)
 * - LOW:      1-2 low-impact findings (email, phone only)
 * - NONE:     No findings
 *
 * @param {object[]} findings - Array of PII findings
 * @returns {{ level: string, label: string, description: string }}
 */
export function classifyRisk(findings) {
  if (!findings || findings.length === 0) {
    return {
      level: 'none',
      label: 'No Risk',
      description: 'No potential PII was detected in this document.',
    };
  }

  const HIGH_IMPACT = ['aadhaar', 'pan', 'passport', 'credit_card'];
  const highImpactCount = findings.filter(f => HIGH_IMPACT.includes(f.type)).length;
  const totalCount = findings.length;

  if (highImpactCount >= 5 || totalCount >= 10) {
    return {
      level: 'critical',
      label: 'Critical',
      description: `${highImpactCount} government ID/financial candidate(s) among ${totalCount} total finding(s). Immediate review recommended.`,
    };
  }

  if (highImpactCount > 0) {
    return {
      level: 'high',
      label: 'High',
      description: `${highImpactCount} potential government ID or financial identifier(s) detected. Review and redact before sharing.`,
    };
  }

  if (totalCount >= 3) {
    return {
      level: 'medium',
      label: 'Medium',
      description: `${totalCount} potential personal information item(s) detected. Review before sharing.`,
    };
  }

  return {
    level: 'low',
    label: 'Low',
    description: `${totalCount} low-impact finding(s) detected. Review recommended.`,
  };
}

/**
 * Summarize findings by type.
 * @param {object[]} findings
 * @returns {object} Map of type → count
 */
export function summarizeFindings(findings) {
  const summary = {};
  for (const f of findings) {
    summary[f.type] = (summary[f.type] || 0) + 1;
  }
  return summary;
}

export { PATTERNS, luhnCheck, verhoeffCheck };
