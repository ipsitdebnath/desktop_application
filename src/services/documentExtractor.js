/**
 * documentExtractor.js
 * --------------------
 * Extracts text from supported document formats (TXT, PDF, PNG, JPG).
 *
 * Result structure:
 * {
 *   success: boolean,
 *   text: string,
 *   extractionMethod: 'txt' | 'pdf' | 'ocr' | null,
 *   pageCount: number | null,
 *   warnings: string[],
 *   error: string | null,
 *   metadata: { fileName, fileSize, fileType, extractedAt, durationMs }
 * }
 *
 * Privacy: Never logs document contents or sensitive values.
 */

import { extractPDF } from './pdfExtractor.js';
import { extractImage } from './imageExtractor.js';

/**
 * Extract text from a TXT file via the browser File API.
 * @param {File} file - Browser File object
 * @returns {Promise<object>} Extraction result
 */
export async function extractTXT(file) {
  const start = performance.now();
  const result = makeResult(file.name, file.size, '.txt', 'txt');

  try {
    if (file.size === 0) {
      result.success = true;
      result.text = '';
      result.warnings.push('File is empty — no text to scan.');
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    const text = await file.text();

    if (typeof text !== 'string') {
      result.error = 'Failed to read file contents.';
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    result.success = true;
    result.text = text;
    result.pageCount = 1;

    if (text.trim().length === 0) {
      result.warnings.push('File contains only whitespace — no meaningful text to scan.');
    }
  } catch (err) {
    result.error = `Text extraction failed: ${err.message || 'Unknown error'}`;
  }

  result.metadata.durationMs = Math.round(performance.now() - start);
  return result;
}

/**
 * Main extraction dispatcher.
 * Reads the file using the browser File API and delegates to the
 * appropriate extractor based on file extension.
 *
 * @param {File} file - Browser File object
 * @param {string} ext - Lowercase file extension including dot, e.g. '.txt'
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<object>} Extraction result
 */
export async function extractDocument(file, ext, onProgress) {
  if (!file) {
    return {
      success: false,
      text: '',
      extractionMethod: null,
      pageCount: null,
      warnings: [],
      error: 'No file provided.',
      metadata: { fileName: null, fileSize: 0, fileType: ext, extractedAt: new Date().toISOString(), durationMs: 0 },
    };
  }

  switch (ext) {
    case '.txt':
      onProgress?.(10);
      const txtResult = await extractTXT(file);
      onProgress?.(100);
      return txtResult;

    case '.pdf':
      return await extractPDF(file, onProgress);

    case '.png':
    case '.jpg':
    case '.jpeg':
      return await extractImage(file, ext, onProgress);

    default:
      return {
        success: false,
        text: '',
        extractionMethod: null,
        pageCount: null,
        warnings: [],
        error: `Unsupported file type "${ext}".`,
        metadata: { fileName: file.name, fileSize: file.size, fileType: ext, extractedAt: new Date().toISOString(), durationMs: 0 },
      };
  }
}

/**
 * Create a blank result template.
 */
function makeResult(fileName, fileSize, fileType, method) {
  return {
    success: false,
    text: '',
    extractionMethod: method,
    pageCount: null,
    warnings: [],
    error: null,
    metadata: {
      fileName,
      fileSize,
      fileType,
      extractedAt: new Date().toISOString(),
      durationMs: 0,
    },
  };
}

export { makeResult };
