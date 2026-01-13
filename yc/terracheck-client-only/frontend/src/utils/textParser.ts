/**
 * Advanced text parsing utilities for OCR results
 */

/**
 * Normalize text for better matching (fix common OCR errors)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Fix common OCR character errors
    .replace(/[|]/g, 'I') // Pipe to I
    .replace(/[Il1]/g, (match, offset, str) => {
      // Context-aware: I vs 1 vs l
      const prev = str[offset - 1] || '';
      const next = str[offset + 1] || '';
      if (/[A-Z]/.test(prev) && /[A-Z]/.test(next)) return 'I';
      if (/\d/.test(prev) && /\d/.test(next)) return '1';
      if (/[a-z]/.test(prev) && /[a-z]/.test(next)) return 'l';
      return match;
    })
    // Fix O/0 confusion
    .replace(/[O0]/g, (match, offset, str) => {
      const prev = str[offset - 1] || '';
      const next = str[offset + 1] || '';
      if (/[A-Z]/.test(prev) && /[A-Z]/.test(next)) return 'O';
      if (/\d/.test(prev) && /\d/.test(next)) return '0';
      if (/[A-Z]/.test(prev) && /\d/.test(next)) return '0';
      if (/\d/.test(prev) && /[A-Z]/.test(next)) return '0';
      return match;
    })
    // Fix common word errors
    .replace(/\b0([A-Z])/g, 'O$1') // 0 before letters to O
    .replace(/([A-Z])0([A-Z])/g, '$1O$2') // 0 between letters to O
    .replace(/(\d)0([A-Z])/g, '$10$2') // Keep 0 between number and letter
    .replace(/([A-Z])0(\d)/g, '$1O$2') // O between letter and number
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars
    .trim();
}

/**
 * Extract key-value pairs from text with multiple strategies and better OCR error handling
 */
export function extractKeyValuePairs(text: string): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];
  const lines = text.split('\n').map(l => normalizeText(l)).filter(l => l.length > 0);
  
  for (const line of lines) {
    // Strategy 1: "Key: Value" format (most common) - be more flexible with spacing
    const colonMatch = line.match(/^([^:]+?)\s*[:]\s*(.+)$/);
    if (colonMatch) {
      const key = colonMatch[1].trim().toLowerCase();
      let value = colonMatch[2].trim();
      // Clean up common OCR errors in value
      value = value.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '');
      if (key.length > 0 && value.length > 0) {
        pairs.push({ key, value });
      }
      continue;
    }
    
    // Strategy 2: "Key=Value" format
    const equalsMatch = line.match(/^([^=]+?)\s*[=]\s*(.+)$/);
    if (equalsMatch) {
      const key = equalsMatch[1].trim().toLowerCase();
      let value = equalsMatch[2].trim();
      value = value.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '');
      if (key.length > 0 && value.length > 0) {
        pairs.push({ key, value });
      }
      continue;
    }
    
    // Strategy 3: "Key Value" (space-separated, common words) - more flexible
    const commonKeys = [
      'serial', 'ser', 's/n', 'sn', 'ser no', 'ser#',
      'model', 'mod', 'mdl', 'model no', 'model#',
      'manufacturer', 'mfr', 'maker', 'brand', 'mfg',
      'voltage', 'volt', 'vac', 'volts',
      'amperage', 'amp', 'amps', 'ampere', 'current', 'amperes',
      'wattage', 'watt', 'watts', 'power',
      'pressure', 'psi', 'bar', 'psig',
      'frequency', 'freq', 'hertz', 'hz', 'cycles', 'cycle',
    ];
    
    for (const key of commonKeys) {
      // More flexible pattern: "Key Number: Value" or "Key: Value" or "Key Value"
      const patterns = [
        new RegExp(`^${key}\\s+(?:number|#|no\\.?|num\\.?)?\\s*:?\\s*(.+)$`, 'i'),
        new RegExp(`^${key}\\s*:?\\s*(.+)$`, 'i'),
        // Also match if key appears anywhere in line followed by value
        new RegExp(`${key}\\s*(?:number|#|no\\.?)?\\s*:?\\s*([A-Z0-9\\-\\s]{2,30})`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();
          value = value.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '');
          
          // Skip if value is too short or looks like garbage
          if (value.length < 1 || value.length > 50) continue;
          
          // Normalize key (e.g., "ser" -> "serial")
          const normalizedKey = key === 'ser' || key === 's/n' || key === 'sn' || key === 'ser no' || key === 'ser#' ? 'serial' :
                                key === 'mod' || key === 'mdl' || key === 'model no' || key === 'model#' ? 'model' :
                                key === 'mfr' || key === 'maker' || key === 'brand' || key === 'mfg' ? 'manufacturer' :
                                key === 'volt' || key === 'vac' || key === 'volts' ? 'voltage' :
                                key === 'amp' || key === 'amps' || key === 'ampere' || key === 'current' || key === 'amperes' ? 'amperage' :
                                key === 'watt' || key === 'watts' || key === 'power' ? 'wattage' :
                                key === 'freq' || key === 'hertz' || key === 'hz' || key === 'cycles' || key === 'cycle' ? 'frequency' :
                                key === 'psi' || key === 'bar' || key === 'psig' ? 'pressure' : key;
          
          // Avoid duplicates
          if (!pairs.find(p => p.key === normalizedKey && p.value === value)) {
            pairs.push({
              key: normalizedKey,
              value,
            });
          }
          break;
        }
      }
    }
  }
  
  // Strategy 4: Extract standalone values that look like equipment specs
  // Look for patterns like "240V", "4A", "60Hz" even without explicit labels
  const standalonePatterns = [
    { pattern: /\b(\d{2,4})\s*VAC?\b/i, key: 'voltage' },
    { pattern: /\b(\d+\.?\d*)\s*AMPS?\b/i, key: 'amperage' },
    { pattern: /\b(\d+\.?\d*)\s*A\b(?!\s*[A-Z])/i, key: 'amperage' }, // "4A" but not "4A123"
    { pattern: /\b(\d+\.?\d*)\s*WATTS?\b/i, key: 'wattage' },
    { pattern: /\b(\d+\.?\d*)\s*W\b(?!\s*[A-Z])/i, key: 'wattage' },
    { pattern: /\b(\d+)\s*HZ\b/i, key: 'frequency' },
    { pattern: /\b(\d+)\s*HERTZ\b/i, key: 'frequency' },
    { pattern: /\b(\d+\.?\d*)\s*PSI\b/i, key: 'pressure' },
  ];
  
  for (const { pattern, key } of standalonePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && !pairs.find(p => p.key === key)) {
      pairs.push({
        key,
        value: match[1].trim(),
      });
    }
  }
  
  return pairs;
}

/**
 * Smart serial number extraction with multiple patterns and context
 */
export function extractSerialNumber(text: string): string {
  const normalized = normalizeText(text.toUpperCase());
  const lines = normalized.split('\n');
  
  // Pattern 1: Explicit "Serial Number:" or "SER NO:" format (highest priority)
  const explicitPatterns = [
    /(?:SERIAL|SER)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z0-9]{6,20})/i,
    /S\/N\s*:?\s*([A-Z0-9]{6,20})/i,
    /SN\s*:?\s*([A-Z0-9]{6,20})/i,
  ];
  
  // Check each line for explicit patterns first
  for (const line of lines) {
    for (const pattern of explicitPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].toUpperCase().trim();
        if (!isFalsePositive(candidate) && candidate.length >= 6) {
          return candidate;
        }
      }
    }
  }
  
  // Pattern 2: Letters followed by numbers (e.g., "18D26150") - common format
  const letterNumberPattern = /\b([A-Z]{1,3}\d{4,15})\b/;
  for (const line of lines) {
    const matches = line.matchAll(new RegExp(letterNumberPattern, 'g'));
    for (const match of matches) {
      const candidate = match[1].toUpperCase();
      if (!isFalsePositive(candidate) && candidate.length >= 6) {
        // Prefer matches near "serial" keyword
        if (line.includes('SERIAL') || line.includes('SER') || line.includes('S/N')) {
          return candidate;
        }
      }
    }
  }
  
  // Pattern 3: Numbers followed by letters (e.g., "12345ABC")
  const numberLetterPattern = /\b(\d{4,12}[A-Z]{1,5})\b/;
  for (const line of lines) {
    const match = line.match(numberLetterPattern);
    if (match && !isFalsePositive(match[1])) {
      return match[1].toUpperCase();
    }
  }
  
  // Pattern 4: Pure numeric (8-15 digits) - only if near "serial" keyword
  const numericPattern = /\b(\d{8,15})\b/;
  for (const line of lines) {
    if (line.includes('SERIAL') || line.includes('SER') || line.includes('S/N') || line.includes('SN')) {
      const match = line.match(numericPattern);
      if (match) {
        return match[1];
      }
    }
  }
  
  // Pattern 5: Fallback - look for alphanumeric codes in context
  const alnumPattern = /\b([A-Z0-9]{8,20})\b/;
  for (const line of lines) {
    if (line.includes('SERIAL') || line.includes('SER')) {
      const match = line.match(alnumPattern);
      if (match && !isFalsePositive(match[1])) {
        return match[1].toUpperCase();
      }
    }
  }
  
  return '';
}

/**
 * Smart model number extraction with context awareness
 */
export function extractModelNumber(text: string): string {
  const normalized = normalizeText(text.toUpperCase());
  const lines = normalized.split('\n');
  
  // Pattern 1: Explicit "Model Number:" or "Model:" format (highest priority)
  const explicitPatterns = [
    /MODEL\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z0-9\-]{3,25})/i,
    /MOD\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z0-9\-]{3,25})/i,
  ];
  
  // Check each line for explicit patterns first
  for (const line of lines) {
    for (const pattern of explicitPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        let candidate = match[1].toUpperCase().replace(/\s+/g, '-').trim();
        // Remove "Number" if OCR mistakenly included it
        candidate = candidate.replace(/^(NUMBER|NUM|NO)[\s\-]*/i, '').replace(/[\s\-]*(NUMBER|NUM|NO)$/i, '');
        if (isValidModelNumber(candidate)) {
          return candidate;
        }
      }
    }
  }
  
  // Pattern 2: Dash format (e.g., "MA-ND4", "SS-18DS") - prioritize these
  const dashPattern = /\b([A-Z]{1,3}[-][A-Z0-9]{2,10})\b/;
  for (const line of lines) {
    // Prefer lines with "MODEL" keyword
    if (line.includes('MODEL') || line.includes('MOD')) {
      const match = line.match(dashPattern);
      if (match && isValidModelNumber(match[1])) {
        return match[1];
      }
    }
  }
  
  // Pattern 3: Alphanumeric with numbers (e.g., "HT200", "L200")
  const alnumPattern = /\b([A-Z]{2,5}[A-Z0-9]{2,15})\b/;
  for (const line of lines) {
    if (line.includes('MODEL') || line.includes('MOD')) {
      const match = line.match(alnumPattern);
      if (match && isValidModelNumber(match[1])) {
        return match[1];
      }
    }
  }
  
  // Pattern 4: Fallback - look for dash patterns anywhere
  const dashMatch = normalized.match(dashPattern);
  if (dashMatch && isValidModelNumber(dashMatch[1])) {
    return dashMatch[1];
  }
  
  return '';
}

/**
 * Check if a string is a false positive (common words mistaken for serials/models)
 */
function isFalsePositive(str: string): boolean {
  const falsePositives = [
    'NUMBER', 'NUM', 'NO', 'N0', 'SERIAL', 'MODEL', 'MANUFACTURER',
    'CONTROLS', 'INC', 'CORP', 'LLC', 'LTD', 'COMPANY',
  ];
  return falsePositives.includes(str);
}

/**
 * Check if a string is a valid model number
 */
function isValidModelNumber(str: string): boolean {
  if (!str || str.length < 3 || str.length > 25) return false;
  if (isFalsePositive(str)) return false;
  
  // Must contain at least one number or dash
  if (!/\d/.test(str) && !str.includes('-')) return false;
  
  // Filter out manufacturer names
  const excludedWords = ['CONTROLS', 'INC', 'CORP', 'LLC', 'LTD', 'COMPANY', 'MANUFACTURING'];
  if (excludedWords.some(word => str.includes(word) && str.length < 20)) {
    return false;
  }
  
  return true;
}

/**
 * Extract numeric value with unit (voltage, amperage, etc.) with better pattern matching
 */
export function extractNumericWithUnit(
  text: string,
  unitPatterns: string[],
  minValue?: number,
  maxValue?: number
): string {
  const normalized = normalizeText(text.toUpperCase());
  const lines = normalized.split('\n');
  
  // Try each line for better context
  for (const line of lines) {
    for (const unit of unitPatterns) {
      // Pattern 1: "120 VAC" or "120V" (value before unit)
      const pattern1 = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i');
      const match1 = line.match(pattern1);
      if (match1) {
        const value = parseFloat(match1[1]);
        if ((!minValue || value >= minValue) && (!maxValue || value <= maxValue)) {
          return match1[1];
        }
      }
      
      // Pattern 2: "Voltage: 120" or "120 VAC 60 Hz" (combined)
      const pattern2 = new RegExp(`(?:${unit}|VOLTAGE|VOLT|AMP|AMPERAGE|WATT|WATTAGE|PRESSURE|FREQ|FREQUENCY)\\s*:?\\s*(\\d+(?:\\.\\d+)?)`, 'i');
      const match2 = line.match(pattern2);
      if (match2) {
        const value = parseFloat(match2[1]);
        if ((!minValue || value >= minValue) && (!maxValue || value <= maxValue)) {
          return match2[1];
        }
      }
      
      // Pattern 3: Combined formats like "24VAC 50/60Hz"
      const pattern3 = new RegExp(`(\\d+)\\s*VAC?\\s*(?:\\d+\\/)?(\\d+)?\\s*HZ`, 'i');
      const match3 = line.match(pattern3);
      if (match3 && unit === 'VAC') {
        const value = parseFloat(match3[1]);
        if ((!minValue || value >= minValue) && (!maxValue || value <= maxValue)) {
          return match3[1];
        }
      }
    }
  }
  
  // Fallback: search full text
  for (const unit of unitPatterns) {
    const pattern1 = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i');
    const match1 = normalized.match(pattern1);
    if (match1) {
      const value = parseFloat(match1[1]);
      if ((!minValue || value >= minValue) && (!maxValue || value <= maxValue)) {
        return match1[1];
      }
    }
  }
  
  return '';
}

/**
 * Extract manufacturer name
 */
export function extractManufacturer(text: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  
  // Look for explicit manufacturer labels
  const patterns = [
    /manufacturer\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
    /made\s+by\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
    /brand\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
    /mfr\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
  ];
  
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Must be all caps or title case, no numbers
        if (/^[A-Z][A-Z\s]{1,30}$/.test(candidate) && !/\d/.test(candidate)) {
          return candidate;
        }
      }
    }
  }
  
  return '';
}

/**
 * Multi-line field extraction (handles fields that span multiple lines)
 */
export function extractMultiLineField(
  text: string,
  keyPattern: RegExp,
  maxLines: number = 3
): string {
  const lines = text.split('\n').map(l => normalizeText(l));
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(keyPattern);
    if (match) {
      // Try to get value from same line
      if (match[2] || match[3]) {
        return (match[2] || match[3] || '').trim();
      }
      
      // Try next lines
      let value = '';
      for (let j = i + 1; j < Math.min(i + maxLines + 1, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.match(/^[A-Z\s]+:$/)) { // Not another label
          value += (value ? ' ' : '') + nextLine;
          if (value.length > 5) break; // Got enough
        }
      }
      if (value) return value;
    }
  }
  
  return '';
}

