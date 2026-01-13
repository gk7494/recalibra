/**
 * Local defect detection using computer vision techniques
 * Detects cracks, corrosion, misalignment, and other issues
 */

export interface Defect {
  type: 'crack' | 'corrosion' | 'misalignment' | 'gap' | 'missing_component' | 'deformation' | 'foreign_object' | 'text_warning' | 'other';
  description: string;
  bbox: [number, number, number, number];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

export async function detectDefects(imageBlob: Blob): Promise<Defect[]> {
  const defects: Defect[] = [];
  
  try {
    // Preprocess image for better defect detection
    const { preprocessForDefectDetection } = await import('./imagePreprocessing');
    const imageData = await preprocessForDefectDetection(imageBlob);
    
    // Detect different types of defects with improved algorithms
    const crackDefects = detectCracks(imageData, imageData.width, imageData.height);
    const corrosionDefects = detectCorrosion(imageData, imageData.width, imageData.height);
    const misalignmentDefects = detectMisalignment(imageData);
    const deformationDefects = detectDeformation(imageData);
    
    // Combine all defects
    const allDefects = [...crackDefects, ...corrosionDefects, ...misalignmentDefects, ...deformationDefects];
    
    // Filter: Keep defects with reasonable confidence
    const significantDefects = allDefects.filter(d => 
      d.confidence >= 0.65 // Lowered threshold to catch more real defects
    );
    
    // Merge nearby defects of the same type
    const mergedDefects = mergeNearbyDefects(significantDefects);
    
    // Limit to top 5 most significant defects (increased from 3)
    const topDefects = mergedDefects
      .sort((a, b) => {
        const aScore = (a.confidence * 0.6) + (a.severity === 'high' ? 0.4 : a.severity === 'medium' ? 0.2 : 0.1);
        const bScore = (b.confidence * 0.6) + (b.severity === 'high' ? 0.4 : b.severity === 'medium' ? 0.2 : 0.1);
        return bScore - aScore;
      })
      .slice(0, 5);
    
    defects.push(...topDefects);
  } catch (error) {
    console.error('Defect detection error:', error);
  }
  
  return defects;
}

function detectCracks(imageData: ImageData, width: number, height: number): Defect[] {
  const defects: Defect[] = [];
  const data = imageData.data;
  
  // Faster edge detection - sample less frequently
  const edges: Array<{x: number, y: number, strength: number, direction: number}> = [];
  
  // Use Sobel operator but sample less frequently for speed
  for (let y = 2; y < height - 2; y += 4) {
    for (let x = 2; x < width - 2; x += 4) {
      const idx = (y * width + x) * 4;
      
      // Sobel X kernel
      const sobelX = 
        -1 * data[((y - 1) * width + (x - 1)) * 4] +
         0 * data[((y - 1) * width + x) * 4] +
         1 * data[((y - 1) * width + (x + 1)) * 4] +
        -2 * data[(y * width + (x - 1)) * 4] +
         0 * data[idx] +
         2 * data[(y * width + (x + 1)) * 4] +
        -1 * data[((y + 1) * width + (x - 1)) * 4] +
         0 * data[((y + 1) * width + x) * 4] +
         1 * data[((y + 1) * width + (x + 1)) * 4];
      
      // Sobel Y kernel
      const sobelY = 
        -1 * data[((y - 1) * width + (x - 1)) * 4] +
        -2 * data[((y - 1) * width + x) * 4] +
        -1 * data[((y - 1) * width + (x + 1)) * 4] +
         0 * data[(y * width + (x - 1)) * 4] +
         0 * data[idx] +
         0 * data[(y * width + (x + 1)) * 4] +
         1 * data[((y + 1) * width + (x - 1)) * 4] +
         2 * data[((y + 1) * width + x) * 4] +
         1 * data[((y + 1) * width + (x + 1)) * 4];
      
      const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY);
      const direction = Math.atan2(sobelY, sobelX);
      
      // Threshold for edge detection (adaptive based on image)
      const threshold = 40;
      if (magnitude > threshold) {
        edges.push({ x, y, strength: magnitude, direction });
      }
    }
  }
  
  // Find linear patterns (cracks) - improved algorithm
  if (edges.length > 30) {
    const linearPatterns = findLinearPatternsImproved(edges);
    
    // Filter and rank patterns
    const significantPatterns = linearPatterns
      .filter(p => {
        const length = p.length;
        const avgStrength = p.reduce((sum, e) => sum + e.strength, 0) / length;
        // Require minimum length and strength
        return length > 30 && avgStrength > 50;
      })
      .sort((a, b) => {
        // Sort by length * average strength
        const aScore = a.length * (a.reduce((sum, e) => sum + e.strength, 0) / a.length);
        const bScore = b.length * (b.reduce((sum, e) => sum + e.strength, 0) / b.length);
        return bScore - aScore;
      })
      .slice(0, 2); // Top 2 most significant cracks
    
    for (const pattern of significantPatterns) {
      const bbox = getBoundingBox(pattern);
      const avgStrength = pattern.reduce((sum, p) => sum + p.strength, 0) / pattern.length;
      const length = pattern.length;
      
      defects.push({
        type: 'crack',
        description: `Crack detected (${length} edge points, strength: ${Math.round(avgStrength)})`,
        bbox,
        severity: length > 60 && avgStrength > 70 ? 'high' : length > 40 ? 'medium' : 'low',
        confidence: Math.min(0.95, 0.70 + (length / 150) + (avgStrength / 300)),
      });
    }
  }
  
  return defects;
}

function findLinearPatternsImproved(
  edges: Array<{x: number, y: number, strength: number, direction: number}>
): Array<Array<{x: number, y: number, strength: number}>> {
  const patterns: Array<Array<{x: number, y: number, strength: number}>> = [];
  const used = new Set<string>();
  
  for (const edge of edges) {
    const key = `${edge.x},${edge.y}`;
    if (used.has(key)) continue;
    
    const pattern: Array<{x: number, y: number, strength: number}> = [{ x: edge.x, y: edge.y, strength: edge.strength }];
    used.add(key);
    
    // Find nearby edges with similar direction (cracks are linear)
    const directionTolerance = Math.PI / 6; // 30 degrees
    
    for (const other of edges) {
      const otherKey = `${other.x},${other.y}`;
      if (used.has(otherKey)) continue;
      
      const distance = Math.sqrt(Math.pow(edge.x - other.x, 2) + Math.pow(edge.y - other.y, 2));
      const directionDiff = Math.abs(edge.direction - other.direction);
      const normalizedDirDiff = Math.min(directionDiff, 2 * Math.PI - directionDiff);
      
      // Must be nearby AND have similar direction
      if (distance < 25 && normalizedDirDiff < directionTolerance) {
        pattern.push({ x: other.x, y: other.y, strength: other.strength });
        used.add(otherKey);
      }
    }
    
    if (pattern.length > 10) {
      patterns.push(pattern);
    }
  }
  
  return patterns;
}

function detectCorrosion(imageData: ImageData, width: number, height: number): Defect[] {
  const defects: Defect[] = [];
  const data = imageData.data;
  
  // Improved corrosion detection using color analysis
  // Corrosion often appears as dark brown/reddish regions
  const corrosionRegions: Array<{x: number, y: number, darkness: number, redness: number}> = [];
  
  // Sample less frequently for speed
  for (let y = 0; y < height; y += 6) {
    for (let x = 0; x < width; x += 6) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      // Check for dark regions with reddish/brownish tint (corrosion)
      const redness = r / (g + b + 1); // Higher red component
      const isDark = brightness < 80;
      const isReddish = redness > 1.2 && r > g && r > b;
      
      if (isDark || (brightness < 120 && isReddish)) {
        corrosionRegions.push({ 
          x, 
          y, 
          darkness: 255 - brightness,
          redness: redness 
        });
      }
    }
  }
  
  // Cluster corrosion regions
  if (corrosionRegions.length > 20) {
    const clusters = clusterPoints(corrosionRegions, 60);
    
    // Filter and rank clusters
    const significantClusters = clusters
      .filter(c => {
        const avgDarkness = c.reduce((sum, p) => sum + p.darkness, 0) / c.length;
        const avgRedness = c.reduce((sum, p) => sum + p.redness, 0) / c.length;
        // Require minimum size and darkness/redness
        return c.length > 20 && (avgDarkness > 150 || avgRedness > 1.3);
      })
      .sort((a, b) => {
        const aScore = a.length * (a.reduce((sum, p) => sum + p.darkness, 0) / a.length);
        const bScore = b.length * (b.reduce((sum, p) => sum + p.darkness, 0) / b.length);
        return bScore - aScore;
      })
      .slice(0, 2); // Top 2 most significant
    
    for (const cluster of significantClusters) {
      const bbox = getBoundingBox(cluster);
      const avgDarkness = cluster.reduce((sum, p) => sum + p.darkness, 0) / cluster.length;
      const avgRedness = cluster.reduce((sum, p) => sum + p.redness, 0) / cluster.length;
      
      defects.push({
        type: 'corrosion',
        description: `Corrosion detected (${cluster.length} points, darkness: ${Math.round(avgDarkness)})`,
        bbox,
        severity: avgDarkness > 180 || avgRedness > 1.5 ? 'high' : 'medium',
        confidence: Math.min(0.9, 0.70 + (avgDarkness / 250) + (avgRedness / 5)),
      });
    }
  }
  
  return defects;
}

function detectMisalignment(_imageData: ImageData): Defect[] {
  // Skip misalignment detection - too many false positives
  return [];
}

function detectDeformation(_imageData: ImageData): Defect[] {
  // Skip deformation detection - too many false positives
  return [];
}

// Helper functions

function mergeNearbyDefects(defects: Defect[]): Defect[] {
  if (defects.length === 0) return [];
  
  const merged: Defect[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < defects.length; i++) {
    if (used.has(i)) continue;
    
    const defect = defects[i];
    const mergedDefect = { ...defect };
    used.add(i);
    
    // Find nearby defects of the same type to merge
    for (let j = i + 1; j < defects.length; j++) {
      if (used.has(j) || defects[j].type !== defect.type) continue;
      
      const [x1, y1, x2, y2] = defect.bbox;
      const [x3, y3, x4, y4] = defects[j].bbox;
      
      const center1 = [(x1 + x2) / 2, (y1 + y2) / 2];
      const center2 = [(x3 + x4) / 2, (y3 + y4) / 2];
      const distance = Math.sqrt(
        Math.pow(center1[0] - center2[0], 2) + 
        Math.pow(center1[1] - center2[1], 2)
      );
      
      // Merge if within 100 pixels
      if (distance < 100) {
        mergedDefect.bbox = [
          Math.min(x1, x3),
          Math.min(y1, y3),
          Math.max(x2, x4),
          Math.max(y2, y4),
        ];
        mergedDefect.confidence = Math.max(mergedDefect.confidence, defects[j].confidence);
        if (defects[j].severity === 'high' || mergedDefect.severity === 'low') {
          mergedDefect.severity = defects[j].severity;
        }
        used.add(j);
      }
    }
    
    merged.push(mergedDefect);
  }
  
  return merged;
}

function clusterPoints<T extends {x: number, y: number}>(points: T[], threshold: number): T[][] {
  const clusters: T[][] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    
    const cluster: T[] = [points[i]];
    used.add(i);
    
    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      
      const distance = Math.sqrt(
        Math.pow(points[i].x - points[j].x, 2) +
        Math.pow(points[i].y - points[j].y, 2)
      );
      
      if (distance < threshold) {
        cluster.push(points[j]);
        used.add(j);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

function getBoundingBox<T extends {x: number, y: number}>(points: T[]): [number, number, number, number] {
  if (points.length === 0) return [0, 0, 0, 0];
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  return [
    Math.max(0, Math.min(...xs) - 10),
    Math.max(0, Math.min(...ys) - 10),
    Math.min(10000, Math.max(...xs) + 10),
    Math.min(10000, Math.max(...ys) + 10),
  ];
}

// Removed calculateVariance - no longer used

