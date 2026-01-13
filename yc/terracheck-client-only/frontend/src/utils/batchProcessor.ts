/**
 * Batch processing for multiple inspections
 */

import { getInspections, updateInspection, getImageUrl } from '../db';
import { runTerraCheckPipeline } from '../inference';

export async function processBatchInspection(inspectionIds: string[]): Promise<void> {
  for (const id of inspectionIds) {
    try {
      const inspection = (await getInspections()).find(i => i.id === id);
      if (!inspection || inspection.status !== 'draft') continue;

      await updateInspection(id, { status: 'processing', progress: 0 });

      const imageBlobs: Blob[] = [];
      for (const imageId of inspection.imageIds) {
        const url = await getImageUrl(imageId);
        if (url) {
          const response = await fetch(url);
          imageBlobs.push(await response.blob());
        }
      }

      if (imageBlobs.length === 0) {
        await updateInspection(id, { status: 'failed', failureReason: 'No images found' });
        continue;
      }

      const result = await runTerraCheckPipeline(imageBlobs, { engineMode: 'browser' });

      await updateInspection(id, {
        status: 'completed',
        progress: 100,
        issuesFound: result.overall_summary.issues_found,
        summaryText: result.overall_summary.summary_text,
        confidence: result.overall_summary.confidence,
        result,
      });
    } catch (error) {
      console.error(`Batch processing failed for ${id}:`, error);
      await updateInspection(id, {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

