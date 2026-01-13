/**
 * TerraCheck inference pipeline with pluggable engine modes
 */

import type { TerraCheckResult } from './types';
import { extractTextFromImage, extractLabelsFromText, extractTextBlocks } from './ocr';
import { detectDefects } from './utils/defectDetection';
import { getOptimizedImage } from './utils/imageCache';

export type EngineMode = 'browser' | 'remote';

export interface InferenceOptions {
  engineMode?: EngineMode;
  onProgress?: (progress: number) => void;
}

/**
 * Main inference pipeline entry point
 */
export async function runTerraCheckPipeline(
  imageBlobs: Blob[],
  options?: InferenceOptions
): Promise<TerraCheckResult> {
  if (imageBlobs.length === 0) {
    return getEmptyResult('No images provided');
  }

  const engineMode = options?.engineMode ?? 'browser';
  const onProgress = options?.onProgress;

  if (engineMode === 'browser') {
    return runBrowserEngine(imageBlobs, onProgress);
  }

  if (engineMode === 'remote') {
    return runRemoteEngine(imageBlobs);
  }

  throw new Error(`Unsupported engine mode: ${engineMode}`);
}

/**
 * Browser-based engine using Tesseract.js and canvas-based CV
 */
async function runBrowserEngine(
  imageBlobs: Blob[],
  onProgress?: (progress: number) => void
): Promise<TerraCheckResult> {
  try {
    onProgress?.(10);

    // Get optimized/cached images for performance
    const resizedBlobs = await Promise.all(
      imageBlobs.map(blob => getOptimizedImage(blob, 800, 0.85))
    );

    onProgress?.(20);

    // Use first image for OCR and defect detection
    const primaryImage = resizedBlobs[0];

    // Run OCR first (most important), then defect detection
    onProgress?.(30);

    // OCR with shorter timeout
    const ocrResult = await Promise.race([
      extractTextFromImage(primaryImage),
      new Promise<{ text: string; words: any[] }>((resolve) =>
        setTimeout(() => {
          console.warn('OCR timeout, using empty result');
          resolve({ text: '', words: [] });
        }, 12000) // Reduced from 20s to 12s
      ),
    ]);

    onProgress?.(60);

    // Defect detection in parallel (non-blocking)
    const defectsPromise = Promise.race([
      detectDefects(primaryImage),
      new Promise<any[]>((resolve) =>
        setTimeout(() => {
          console.warn('Defect detection timeout');
          resolve([]);
        }, 10000) // Reduced from 15s to 10s
      ),
    ]);

    // Process OCR results immediately
    let textBlocks: TerraCheckResult['text_blocks'] = [];
    let labels: Record<string, string> = {};
    
    try {
      textBlocks = extractTextBlocks(ocrResult);
    } catch (e) {
      console.warn('Text block extraction failed:', e);
    }
    
    try {
      labels = await extractLabelsFromText(ocrResult.text || '');
    } catch (e) {
      console.warn('Label extraction failed:', e);
    }

    onProgress?.(80);

    // Wait for defect detection (should be fast)
    const defects = await Promise.allSettled([defectsPromise]);

    // Process defect detection results
    let detectedIssues: TerraCheckResult['detected_issues'] = [];
    if (defects[0]?.status === 'fulfilled' && Array.isArray(defects[0].value)) {
      detectedIssues = defects[0].value.map(defect => ({
        type: defect.type,
        description: defect.description,
        bbox: defect.bbox,
        severity: defect.severity,
        confidence: defect.confidence,
      }));
    }

    onProgress?.(90);

    // Debug: Log extracted data
    console.log('📊 OCR Extraction Results:', {
      rawTextLength: ocrResult.text?.length || 0,
      textBlocksCount: textBlocks.length,
      labelsCount: Object.keys(labels).length,
      labels: labels,
      sampleText: ocrResult.text?.substring(0, 200),
    });

    // Build result
    const result: TerraCheckResult = {
      text_blocks: textBlocks,
      tables: [], // Tables extraction not yet implemented
      labels: labels,
      detected_issues: detectedIssues,
      overall_summary: {
        issues_found: detectedIssues.length,
        confidence:
          detectedIssues.length > 0
            ? detectedIssues.reduce((sum, issue) => sum + issue.confidence, 0) / detectedIssues.length
            : 0.85,
        summary_text:
          detectedIssues.length === 0
            ? 'No defects detected. Equipment appears to be in good condition.'
            : `Detected ${detectedIssues.length} potential issue${detectedIssues.length > 1 ? 's' : ''} requiring attention.`,
      },
    };

    onProgress?.(100);
    return result;
  } catch (error) {
    console.error('Browser engine error:', error);
    return getEmptyResult('Processing error occurred');
  }
}

/**
 * Remote engine stub (for future backend integration)
 */
async function runRemoteEngine(_imageBlobs: Blob[]): Promise<TerraCheckResult> {
  throw new Error('Remote engine not implemented yet');
}

/**
 * Returns an empty result structure
 */
function getEmptyResult(reason?: string): TerraCheckResult {
  return {
    text_blocks: [],
    tables: [],
    labels: {},
    detected_issues: [],
    overall_summary: {
      issues_found: 0,
      confidence: 0.0,
      summary_text: reason || 'Processing completed. No issues detected.',
    },
  };
}
