/**
 * Helper functions for normalizing and extracting labels from OCR results
 */

/**
 * Get label value with case-insensitive matching and key variations
 */
export function getLabelValue(labels: Record<string, string>, keys: string[]): string {
  if (!labels || Object.keys(labels).length === 0) return '';
  
  const normalizedEntries = Object.entries(labels).map(([k, v]) => [k.toLowerCase().trim(), v] as const);
  
  for (const key of keys) {
    const lower = key.toLowerCase();
    const match = normalizedEntries.find(([k]) => k.includes(lower) || lower.includes(k));
    if (match) return match[1];
  }
  
  return '';
}

/**
 * Strip units from values (V, A, W, kW, PSI, bar, etc.)
 */
export function stripUnits(raw: string): string {
  if (!raw) return '';
  // Remove common units and keep only numbers, decimals, and common separators
  return raw.replace(/[^\d./-]/g, '').trim();
}

/**
 * Check if issue description matches keywords (case-insensitive)
 */
export function matchesKeywords(description: string, keywords: string[]): boolean {
  if (!description) return false;
  const lowerDesc = description.toLowerCase();
  return keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase()));
}


