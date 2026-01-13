/**
 * Data export and backup functionality
 */

import { getInspections, getInspectionImages } from '../db';
import type { Inspection } from '../types';

export interface ExportOptions {
  format: 'json' | 'csv';
  includeImages?: boolean;
  dateRange?: { start: string; end: string };
  statusFilter?: Inspection['status'][];
}

/**
 * Export all inspections to JSON backup file
 */
export async function exportAllInspections(options: ExportOptions = { format: 'json' }): Promise<Blob> {
  const allInspections = await getInspections();
  
  // Apply filters
  let filtered = allInspections;
  
  if (options.statusFilter && options.statusFilter.length > 0) {
    filtered = filtered.filter(i => options.statusFilter!.includes(i.status));
  }
  
  if (options.dateRange) {
    filtered = filtered.filter(i => {
      const date = new Date(i.createdAt);
      return date >= new Date(options.dateRange!.start) && date <= new Date(options.dateRange!.end);
    });
  }
  
  // Build export data
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalInspections: filtered.length,
    inspections: await Promise.all(
      filtered.map(async (inspection) => {
        const inspectionData: any = {
          id: inspection.id,
          name: inspection.name,
          createdAt: inspection.createdAt,
          updatedAt: inspection.updatedAt,
          status: inspection.status,
          progress: inspection.progress,
          issuesFound: inspection.issuesFound,
          summaryText: inspection.summaryText,
          confidence: inspection.confidence,
          result: inspection.result,
          failureReason: inspection.failureReason,
          imageCount: inspection.imageIds.length,
        };
        
        // Include image URLs if requested
        if (options.includeImages) {
          const imageUrls = await getInspectionImages(inspection.id);
          inspectionData.imageUrls = imageUrls;
        }
        
        return inspectionData;
      })
    ),
  };
  
  if (options.format === 'json') {
    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  } else {
    // CSV format
    const csvRows = [
      'ID,Name,Created At,Status,Issues Found,Confidence,Summary',
      ...filtered.map(i => {
        const summary = (i.summaryText || '').replace(/"/g, '""');
        return `"${i.id}","${i.name}","${i.createdAt}","${i.status}",${i.issuesFound || 0},${i.confidence || 0},"${summary}"`;
      }),
    ];
    return new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  }
}

/**
 * Export single inspection with all data
 */
export async function exportInspectionBackup(inspectionId: string): Promise<Blob> {
  const inspections = await getInspections();
  const inspection = inspections.find(i => i.id === inspectionId);
  
  if (!inspection) {
    throw new Error('Inspection not found');
  }
  
  // Get all image URLs
  const imageUrls = await getInspectionImages(inspection.id);
  
  const backupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    inspection: {
      ...inspection,
      imageUrls,
    },
  };
  
  const json = JSON.stringify(backupData, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Import inspections from backup file
 */
export async function importInspections(backupBlob: Blob): Promise<{ imported: number; errors: string[] }> {
  const text = await backupBlob.text();
  const data = JSON.parse(text);
  
  if (!data.inspections || !Array.isArray(data.inspections)) {
    throw new Error('Invalid backup format');
  }
  
  const { createInspection, updateInspection, addImage } = await import('../db');
  const errors: string[] = [];
  let imported = 0;
  
  for (const inspectionData of data.inspections) {
    try {
      // Create inspection
      const inspection = await createInspection(inspectionData.name);
      
      // Update with all data
      await updateInspection(inspection.id, {
        status: inspectionData.status || 'draft',
        progress: inspectionData.progress || 0,
        issuesFound: inspectionData.issuesFound,
        summaryText: inspectionData.summaryText,
        confidence: inspectionData.confidence,
        result: inspectionData.result,
        failureReason: inspectionData.failureReason,
      });
      
      // Import images if URLs provided
      if (inspectionData.imageUrls && Array.isArray(inspectionData.imageUrls)) {
        for (let i = 0; i < inspectionData.imageUrls.length; i++) {
          try {
            const url = inspectionData.imageUrls[i];
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], `image_${i}.jpg`, { type: blob.type });
            await addImage(inspection.id, file, i);
          } catch (e) {
            console.warn(`Failed to import image ${i}:`, e);
          }
        }
      }
      
      imported++;
    } catch (error: any) {
      errors.push(`Failed to import ${inspectionData.name}: ${error.message}`);
    }
  }
  
  return { imported, errors };
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalInspections: number;
  totalImages: number;
  storageUsed: number;
  cacheSize: number;
}> {
  const inspections = await getInspections();
  const totalImages = inspections.reduce((sum, i) => sum + i.imageIds.length, 0);
  
  // Estimate storage (rough calculation)
  const storageUsed = inspections.length * 1024; // ~1KB per inspection metadata
  
  // Get cache size
  let cacheSize = 0;
  try {
    const { openCacheDB } = await import('./imageCache');
    const db = await openCacheDB();
    const tx = db.transaction(['imageCache'], 'readonly');
    const store = tx.objectStore('imageCache');
    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cacheSize += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to get cache size:', e);
  }
  
  return {
    totalInspections: inspections.length,
    totalImages,
    storageUsed,
    cacheSize,
  };
}

