/**
 * imageExtractor.js
 * ------------------
 * Extracts text from images (PNG, JPG/JPEG) using Tesseract.js OCR.
 *
 * Uses the local Tesseract.js worker for privacy — no external API calls.
 * Processes images entirely in-browser.
 *
 * Limitations:
 * - OCR accuracy depends on image quality, resolution, and text clarity.
 * - Handwritten text may not be recognized.
 * - Language data is fetched from the CDN by default on first use.
 *
 * Privacy: Never logs extracted text content.
 */

import { makeResult } from './documentExtractor.js';

/**
 * Extract text from an image file using Tesseract.js OCR.
 * @param {File} file - Browser File object
 * @param {string} ext - File extension (.png, .jpg, .jpeg)
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<object>} Extraction result
 */
export async function extractImage(file, ext, onProgress) {
  const start = performance.now();
  const result = makeResult(file.name, file.size, ext, 'ocr');

  let worker = null;

  try {
    onProgress?.(5);

    // Dynamically import Tesseract.js
    const Tesseract = await import('tesseract.js');
    const { createWorker } = Tesseract;

    onProgress?.(10);

    // Create a Tesseract worker for English text
    worker = await createWorker('eng', 1, {
      logger: (info) => {
        // Map Tesseract progress to our 10-90 range
        if (info.status === 'recognizing text' && typeof info.progress === 'number') {
          const mapped = 10 + Math.round(info.progress * 80);
          onProgress?.(mapped);
        }
      },
    });

    onProgress?.(20);

    // Perform OCR
    const { data } = await worker.recognize(file);

    onProgress?.(92);

    if (!data || typeof data.text !== 'string') {
      result.error = 'OCR produced no output. The image may be unreadable.';
      result.metadata.durationMs = Math.round(performance.now() - start);
      return result;
    }

    result.success = true;
    result.text = data.text;
    result.pageCount = 1;

    // Assess OCR quality
    const trimmed = data.text.trim();
    if (trimmed.length === 0) {
      result.warnings.push(
        'OCR completed but no text was detected. ' +
        'The image may not contain readable text, or the text may be too small or blurry.'
      );
    } else if (data.confidence != null && data.confidence < 40) {
      result.warnings.push(
        `OCR confidence is low (${Math.round(data.confidence)}%). ` +
        'Results may be inaccurate. Consider using a higher-quality image.'
      );
    } else if (data.confidence != null && data.confidence < 70) {
      result.warnings.push(
        `OCR confidence is moderate (${Math.round(data.confidence)}%). ` +
        'Some text may be incorrectly recognized.'
      );
    }

    onProgress?.(95);
  } catch (err) {
    const msg = err.message || 'Unknown error';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to load')) {
      result.error = 'OCR language data could not be loaded. Check your network connection.';
    } else {
      result.error = `Image OCR failed: ${msg}`;
    }
  } finally {
    // Always release the worker to free memory
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup errors
      }
    }
  }

  result.metadata.durationMs = Math.round(performance.now() - start);
  onProgress?.(100);
  return result;
}
