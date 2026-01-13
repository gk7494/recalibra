/**
 * IndexedDB storage for client-only TerraCheck
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Equipment {
  id: string;
  serialNumber: string;
  modelNumber: string;
  manufacturer?: string;
  location?: string;
  equipmentType?: string;
  voltage?: string;
  amperage?: string;
  wattage?: string;
  frequency?: string;
  pressure?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface InspectionDB extends DBSchema {
  inspections: {
    key: string;
    value: Inspection;
    indexes: { 'by-status': string };
  };
  images: {
    key: string;
    value: { id: string; inspectionId: string; data: Blob; index: number };
    indexes: { 'by-inspection': string };
  };
  equipment: {
    key: string;
    value: Equipment;
    indexes: { 'by-serial': string; 'by-model': string };
  };
}

import type { Inspection, TerraCheckResult } from './types';

// Re-export types for backward compatibility
export type { Inspection, TerraCheckResult };

let db: IDBPDatabase<InspectionDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<InspectionDB>> {
  if (db) return db;

  db = await openDB<InspectionDB>('terracheck', 2, {
    upgrade(database) {
      // Inspections store
      if (!database.objectStoreNames.contains('inspections')) {
        const inspectionStore = database.createObjectStore('inspections', {
          keyPath: 'id',
        });
        inspectionStore.createIndex('by-status', 'status');
      }

      // Images store
      if (!database.objectStoreNames.contains('images')) {
        const imageStore = database.createObjectStore('images', {
          keyPath: 'id',
        });
        imageStore.createIndex('by-inspection', 'inspectionId');
      }

      // Equipment store
      if (!database.objectStoreNames.contains('equipment')) {
        const equipmentStore = database.createObjectStore('equipment', {
          keyPath: 'id',
        });
        equipmentStore.createIndex('by-serial', 'serialNumber');
        equipmentStore.createIndex('by-model', 'modelNumber');
      }
    },
  });

  return db;
}

export async function createInspection(name?: string, templateId?: string): Promise<Inspection> {
  const database = await getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const inspection: Inspection = {
    id,
    name: name || `Inspection ${id.slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    progress: 0,
    issuesFound: null,
    summaryText: null,
    confidence: null,
    result: null,
    failureReason: null,
    imageIds: [],
    templateId,
    templateFields: {},
  };

  await database.add('inspections', inspection);
  return inspection;
}

export async function getInspection(id: string): Promise<Inspection | undefined> {
  const database = await getDB();
  return database.get('inspections', id);
}

export async function getInspections(status?: string): Promise<Inspection[]> {
  const database = await getDB();
  if (status) {
    return database.getAllFromIndex('inspections', 'by-status', status);
  }
  return database.getAll('inspections');
}

export async function updateInspection(id: string, updates: Partial<Inspection>): Promise<void> {
  const database = await getDB();
  const inspection = await database.get('inspections', id);
  if (!inspection) return;

  const updated = {
    ...inspection,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await database.put('inspections', updated);
}

/**
 * Update an entire inspection object
 */
export async function updateInspectionFull(inspection: Inspection): Promise<void> {
  const database = await getDB();
  const updated = {
    ...inspection,
    updatedAt: new Date().toISOString(),
  };
  await database.put('inspections', updated);
}

export async function deleteInspection(id: string): Promise<void> {
  const database = await getDB();
  
  // Delete images first
  const imageTx = database.transaction('images', 'readwrite');
  const imageStore = imageTx.store;
  const imageIndex = imageStore.index('by-inspection');
  const images = await imageIndex.getAll(id);
  for (const img of images) {
    if (img && img.id) {
      await imageStore.delete(img.id);
    }
  }
  await imageTx.done;

  // Delete inspection
  const inspectionTx = database.transaction('inspections', 'readwrite');
  const inspectionStore = inspectionTx.store;
  await inspectionStore.delete(id);
  await inspectionTx.done;
}

export async function addImage(
  inspectionId: string,
  file: File,
  index: number
): Promise<string> {
  const database = await getDB();
  const imageId = crypto.randomUUID();
  const blob = new Blob([file], { type: file.type });

  await database.add('images', {
    id: imageId,
    inspectionId,
    data: blob,
    index,
  });

  // Update inspection
  const inspection = await database.get('inspections', inspectionId);
  if (inspection) {
    inspection.imageIds.push(imageId);
    await database.put('inspections', inspection);
  }

  return imageId;
}

export async function getImageUrl(imageId: string): Promise<string | null> {
  const database = await getDB();
  const image = await database.get('images', imageId);
  if (!image || !image.data) return null;
  return URL.createObjectURL(image.data);
}

export async function getInspectionImages(inspectionId: string): Promise<string[]> {
  const database = await getDB();
  const images = await database.getAllFromIndex('images', 'by-inspection', inspectionId);
  return images.map((img) => {
    if (img && img.data) {
      return URL.createObjectURL(img.data);
    }
    return '';
  }).filter(url => url !== '');
}

// Equipment CRUD functions
export async function createEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
  const database = await getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const equipment: Equipment = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await database.add('equipment', equipment);
  return equipment;
}

export async function getEquipment(id: string): Promise<Equipment | undefined> {
  const database = await getDB();
  return database.get('equipment', id);
}

export async function getAllEquipment(): Promise<Equipment[]> {
  const database = await getDB();
  return database.getAll('equipment');
}

export async function updateEquipment(id: string, updates: Partial<Equipment>): Promise<void> {
  const database = await getDB();
  const equipment = await database.get('equipment', id);
  if (!equipment) return;

  const updated = {
    ...equipment,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await database.put('equipment', updated);
}

export async function deleteEquipment(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('equipment', id);
}

export type { Equipment };

