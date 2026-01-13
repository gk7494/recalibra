/**
 * Image caching and optimization utilities
 */

const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache


/**
 * Get optimized/cached version of image
 */
export async function getOptimizedImage(originalBlob: Blob, maxWidth: number = 800, quality: number = 0.85): Promise<Blob> {
  // Check cache first
  const cacheKey = await getImageHash(originalBlob);
  const cached = await getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Optimize image
  const optimized = await optimizeImage(originalBlob, maxWidth, quality);
  
  // Store in cache
  await storeInCache(cacheKey, optimized);
  
  return optimized;
}

/**
 * Optimize image by resizing and compressing
 */
async function optimizeImage(blob: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height / width) * maxWidth;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Use faster, lower quality rendering for speed
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with compression
      canvas.toBlob(
        (optimizedBlob) => {
          if (optimizedBlob) {
            resolve(optimizedBlob);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Simple hash function for image cache key
 */
async function getImageHash(blob: Blob): Promise<string> {
  // Use size + first few bytes as hash (fast, not cryptographically secure)
  const slice = blob.slice(0, 100);
  const arrayBuffer = await slice.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const hash = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 32);
  return `${blob.size}_${hash}`;
}

/**
 * Cache management using IndexedDB
 */
async function getFromCache(key: string): Promise<Blob | null> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(['imageCache'], 'readonly');
    const store = tx.objectStore('imageCache');
    const cached = await new Promise<any>((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    
    if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
      return cached.optimizedBlob;
    }
    
    return null;
  } catch (e) {
    console.warn('Cache read failed:', e);
    return null;
  }
}

async function storeInCache(key: string, blob: Blob): Promise<void> {
  try {
    // Check cache size and evict if needed
    await evictOldCache();
    
    const db = await openCacheDB();
    const tx = db.transaction(['imageCache'], 'readwrite');
    const store = tx.objectStore('imageCache');
    
    await store.put({
      key,
      optimizedBlob: blob,
      timestamp: Date.now(),
      size: blob.size,
    });
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

async function evictOldCache(): Promise<void> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(['imageCache'], 'readwrite');
    const store = tx.objectStore('imageCache');
    const index = store.index('by-timestamp');
    
    let totalSize = 0;
    const entries: Array<{ key: string; size: number; timestamp: number }> = [];
    
    // Get all entries using cursor
    await new Promise<void>((resolve, reject) => {
      const req = index.openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          entries.push({
            key: cursor.key as string,
            size: cursor.value.size,
            timestamp: cursor.value.timestamp,
          });
          totalSize += cursor.value.size;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until under limit
    while (totalSize > MAX_CACHE_SIZE && entries.length > 0) {
      const entry = entries.shift()!;
      await new Promise<void>((resolve, reject) => {
        const req = store.delete(entry.key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      totalSize -= entry.size;
    }
  } catch (e) {
    console.warn('Cache eviction failed:', e);
  }
}

let cacheDB: IDBDatabase | null = null;

export async function openCacheDB(): Promise<IDBDatabase> {
  if (cacheDB) return cacheDB;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('terracheck-image-cache', CACHE_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      cacheDB = request.result;
      resolve(cacheDB);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('imageCache')) {
        const store = db.createObjectStore('imageCache', { keyPath: 'key' });
        store.createIndex('by-timestamp', 'timestamp');
      }
    };
  });
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(['imageCache'], 'readwrite');
    const store = tx.objectStore('imageCache');
    await store.clear();
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}

