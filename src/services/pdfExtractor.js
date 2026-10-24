/**
 * pdfExtractor.js
 * ----------------
 * Extracts selectable text from PDF documents using pdfjs-dist.
 * Processes pages individually and preserves page boundaries.
 *
 * Limitations:
 * - Only extracts selectable/embedded text, not scanned images within PDFs.
 * - Password-protected PDFs will fail with an appropriate error.
 * - Complex PDF layouts may produce imperfect text ordering.
 *
 * Privacy: Never logs extracted text content.
 */

import { makeResult } from './documentExtractor.js';

/**
 * Extract text from a PDF file.
 * @param {File} file - Browser File object
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<object>} Extraction result
 */
export async function extractPDF(file, onProgress) {
  const start = performance.now();
  const result = makeResult(file.name, file.size, '.pdf', 'pdf');

  try {
    onProgress?.(5);

    // Dynamically import pdfjs-dist to keep the initial bundle smaller
    const pdfjsLib = await import('pdfjs-dist');

    // Configure the worker — use the bundled worker from pdfjs-dist
    // For Vite, the worker file needs to be served correctly.
    // pdfjs-dist v4+ bundles a worker that can be imported directly.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Use the legacy build worker which doesn't require separate worker setup
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }

    onProgress?.(10);

    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      result.error = 'PDF file is empty or unreadable.';
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    onProgress?.(15);

    // Load the PDF document
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        // Do not attempt to fetch external resources
        disableAutoFetch: true,
        disableStream: true,
      }).promise;
    } catch (loadError) {
      const msg = loadError.message || '';
      if (msg.includes('password') || msg.includes('Password')) {
        result.error = 'This PDF is password-protected. Please remove the password and try again.';
      } else if (msg.includes('Invalid') || msg.includes('corrupt')) {
        result.error = 'This PDF appears to be malformed or corrupted.';
      } else {
        result.error = `Failed to load PDF: ${msg}`;
      }
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    const numPages = pdf.numPages;
    result.pageCount = numPages;

    if (numPages === 0) {
      result.success = true;
      result.text = '';
      result.warnings.push('PDF has no pages.');
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    onProgress?.(20);

    // Extract text from each page
    const pageTexts = [];
    let totalChars = 0;
    let emptyPages = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Concatenate text items with appropriate spacing
        const pageText = textContent.items
          .map(item => {
            if (item.str !== undefined) return item.str;
            if (item.type === 'endOfLine') return '\n';
            return '';
          })
          .join('');

        const trimmed = pageText.trim();
        if (trimmed.length === 0) {
          emptyPages++;
        }
        totalChars += trimmed.length;
        pageTexts.push(pageText);
      } catch (pageError) {
        pageTexts.push('');
        result.warnings.push(`Could not extract text from page ${pageNum}.`);
      }

      // Report progress (20% to 90% for page extraction)
      const pageProgress = 20 + Math.round((pageNum / numPages) * 70);
      onProgress?.(pageProgress);
    }

    // Combine page texts with page separators
    result.text = pageTexts.join('\n\n');
    result.success = true;

    // Assess extraction quality
    if (totalChars === 0) {
      result.warnings.push(
        'No selectable text found in this PDF. It may be a scanned document. ' +
        'Consider using an image file for OCR-based extraction.'
      );
    } else if (emptyPages > 0 && emptyPages < numPages) {
      result.warnings.push(
        `${emptyPages} of ${numPages} page(s) contained no extractable text. ` +
        'Some pages may be scanned images.'
      );
    }

    onProgress?.(95);

    // Clean up
    await pdf.destroy();

    onProgress?.(100);
  } catch (err) {
    result.error = `PDF extraction failed: ${err.message || 'Unknown error'}`;
  }

  result.metadata.durationMs = Math.round(performance.now() - start);
  return result;
}
