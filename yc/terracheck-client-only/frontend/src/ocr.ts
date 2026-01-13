/**
 * Client-side OCR using Tesseract.js
 */

import { createWorker } from 'tesseract.js';

let worker: any = null;

async function getWorker() {
  if (!worker) {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
  }
  return worker;
}

export interface OCRResult {
  text: string;
  words: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
}

export async function extractTextFromImage(imageBlob: Blob): Promise<OCRResult> {
  // Always return a result - never throw
  let imageUrl: string | null = null;
  let processedUrl: string | null = null;
  
  try {
    if (!imageBlob || imageBlob.size === 0) {
      console.warn('Invalid image blob');
      return { text: '', words: [] };
    }
    
    const worker = await getWorker();
    if (!worker) {
      console.warn('Worker not available');
      return { text: '', words: [] };
    }
    
    // Preprocess image for better OCR accuracy
    const { preprocessForOCR } = await import('./utils/imagePreprocessing');
    processedUrl = await preprocessForOCR(imageBlob);
    imageUrl = processedUrl;
    
    try {
      console.log('Starting OCR recognition with multiple PSM modes...');
      
      // Try multiple PSM modes and combine results for better accuracy
      // Use more modes for better coverage
      const psmModes = [
        { mode: '6', desc: 'uniform block' },  // Best for nameplates
        { mode: '7', desc: 'single line' },    // Good for single-line labels
        { mode: '11', desc: 'sparse text' },   // Good for scattered text
        { mode: '12', desc: 'sparse with OSD' }, // With orientation detection
      ];
      
      const results = await Promise.allSettled(
        psmModes.map(({ mode }) =>
          Promise.race([
            worker.recognize(imageUrl, {
              tessedit_pageseg_mode: mode,
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:()., /@',
              tessedit_ocr_engine_mode: '1', // LSTM only (better accuracy)
            }),
            new Promise<any>((resolve) => 
              setTimeout(() => resolve({ data: { text: '', words: [] } }), 18000)
            )
          ])
        )
      );
      
      // Combine results - prefer longer, more complete text with better word count
      let bestResult: any = { text: '', words: [] };
      let bestScore = 0;
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.data) {
          const data = result.value.data;
          const text = data.text || '';
          const words = data.words || [];
          
          // Score based on text length, word count, and average confidence
          const avgConfidence = words.length > 0
            ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / words.length
            : 0;
          
          const score = text.length * 0.3 + words.length * 10 + avgConfidence * 0.5;
          
          if (score > bestScore) {
            bestScore = score;
            bestResult = data;
          }
        }
      }
      
      // If no good result, try default mode with better config
      if (bestScore === 0 || bestResult.text.length < 10) {
        const { data } = await worker.recognize(imageUrl, {
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:()., /@',
          tessedit_ocr_engine_mode: '1',
        });
        bestResult = data;
      }
      
      console.log('OCR raw text length:', bestResult?.text?.length || 0);
      console.log('OCR words found:', bestResult?.words?.length || 0);
      console.log('OCR extracted text:', bestResult?.text?.substring(0, 300) || '');
      
      // Filter and clean words - balanced threshold
      const words = (bestResult?.words || [])
        .filter((word: any) => {
          const text = word.text?.trim() || '';
          return word.confidence > 20 && // Slightly higher threshold
                 text.length > 0 &&
                 text.length <= 50 && // Filter out very long "words" (likely OCR errors)
                 !/^[^A-Z0-9]+$/.test(text); // Must contain at least one letter or number
        })
        .map((word: any) => ({
          text: word.text.trim(),
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          },
          confidence: word.confidence,
        }));
      
      // Advanced text cleaning (fix common OCR errors)
      let cleanedText = (bestResult?.text || '')
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/[|]/g, 'I') // Pipe to I
        .replace(/[Il1]/g, (match: string, offset: number, str: string) => {
          // Context-aware: I vs 1 vs l
          const prev = str[offset - 1] || '';
          const next = str[offset + 1] || '';
          if (/[A-Z]/.test(prev) && /[A-Z]/.test(next)) return 'I';
          if (/\d/.test(prev) && /\d/.test(next)) return '1';
          if (/[a-z]/.test(prev) && /[a-z]/.test(next)) return 'l';
          return match;
        })
        .replace(/[O0]/g, (match: string, offset: number, str: string) => {
          // Context-aware: O vs 0
          const prev = str[offset - 1] || '';
          const next = str[offset + 1] || '';
          if (/[A-Z]/.test(prev) && /[A-Z]/.test(next)) return 'O';
          if (/\d/.test(prev) && /\d/.test(next)) return '0';
          if (/[A-Z]/.test(prev) && /\d/.test(next)) return '0';
          if (/\d/.test(prev) && /[A-Z]/.test(next)) return '0';
          return match;
        })
        .replace(/\b0([A-Z])/g, 'O$1') // 0 before letters to O
        .replace(/([A-Z])0([A-Z])/g, '$1O$2') // 0 between letters to O
        .replace(/(\d)0([A-Z])/g, '$10$2') // Keep 0 between number and letter
        .replace(/([A-Z])0(\d)/g, '$1O$2') // O between letter and number
        .trim();
      
      console.log('OCR cleaned text sample:', cleanedText.substring(0, 300));
      
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      if (imageUrl && imageUrl !== processedUrl) URL.revokeObjectURL(imageUrl);
      
      return {
        text: cleanedText || '',
        words: words || [],
      };
    } catch (ocrError) {
      console.error('OCR recognition error:', ocrError);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      if (imageUrl && imageUrl !== processedUrl) URL.revokeObjectURL(imageUrl);
      // Return empty result instead of throwing
      return { text: '', words: [] };
    }
  } catch (error) {
    console.error('OCR extraction failed:', error);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    if (imageUrl && imageUrl !== processedUrl) URL.revokeObjectURL(imageUrl);
    // Always return a result - never throw
    return {
      text: '',
      words: [],
    };
  }
}

export async function extractLabelsFromText(text: string): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};
  if (!text || text.trim().length === 0) return labels;
  
  // Use advanced text parser
  const {
    normalizeText,
    extractKeyValuePairs,
    extractSerialNumber,
    extractModelNumber,
    extractNumericWithUnit,
    extractManufacturer,
  } = await import('./utils/textParser');
  
  const normalizedText = normalizeText(text);
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullText = normalizedText.toUpperCase();
  
  // First, extract key-value pairs (most reliable)
  const kvPairs = extractKeyValuePairs(text);
  for (const { key, value } of kvPairs) {
    if (key.includes('serial')) {
      const serial = extractSerialNumber(value) || extractSerialNumber(text);
      if (serial) labels.serial_number = serial;
    } else if (key.includes('model')) {
      const model = extractModelNumber(value) || extractModelNumber(text);
      if (model) labels.model_number = model;
    } else if (key.includes('manufacturer') || key.includes('brand') || key.includes('mfg')) {
      const mfr = extractManufacturer(value) || extractManufacturer(text);
      if (mfr) labels.manufacturer = mfr;
    } else if (key.includes('voltage') || key.includes('volt') || key.includes('vac')) {
      const volt = extractNumericWithUnit(value, ['VAC', 'V', 'VOLTS', 'VOLT'], 10, 1000);
      if (volt) labels.voltage = volt + 'V';
    } else if (key.includes('amp') || key.includes('ampere') || key.includes('current')) {
      const amp = extractNumericWithUnit(value, ['AMPS', 'A', 'AMPERES', 'AMP'], 0.1, 1000);
      if (amp) labels.amperage = amp;
    } else if (key.includes('watt') || key.includes('power')) {
      const watt = extractNumericWithUnit(value, ['WATTS', 'W', 'WATT'], 1, 100000);
      if (watt) labels.wattage = watt;
    } else if (key.includes('freq') || key.includes('hertz') || key.includes('hz')) {
      const freq = extractNumericWithUnit(value, ['HERTZ', 'HZ', 'CYCLES'], 50, 60);
      if (freq) labels.frequency = freq + ' Hz';
    } else if (key.includes('pressure') || key.includes('psi')) {
      const press = extractNumericWithUnit(value, ['PSI', 'psi', 'BAR'], 0, 10000);
      if (press) labels.pressure = press;
    }
  }
  
  // Improved patterns with better matching
  const patterns = {
    serial_number: [
      // "Serial Number: 18D26150" or "Serial Number 18D26150" or "SER NO 2002192513"
      /(?:serial|ser)\s*(?:number|#|no\.?)?\s*:?\s*([A-Z0-9]{6,20})/i,
      /s\/n\s*:?\s*([A-Z0-9]{6,20})/i,
      /sn\s*:?\s*([A-Z0-9]{6,20})/i,
      // Long numeric serials like "2002192513"
      /(?:serial|ser)\s*(?:number|#|no\.?)?\s*:?\s*(\d{8,15})/i,
      // Look for alphanumeric codes that look like serials (6+ chars, mix of letters/numbers)
      /\b([A-Z0-9]{8,20})\b(?=.*serial)/i,
      // Pattern: letters followed by numbers (e.g., "18D26150")
      /\b([A-Z]{1,3}\d{4,15})\b/i,
      // Pattern: numbers followed by letters (e.g., "12345ABC")
      /\b(\d{4,12}[A-Z]{1,5})\b/i,
      // Pure numeric serials (8+ digits)
      /\b(\d{8,15})\b(?=.*(?:serial|ser|s\/n|sn))/i,
    ],
    model_number: [
      // "Model Number: SS-18DS" or "Model Number: MA-ND4" - capture the full model code
      /model\s*(?:number|#|no\.?)?\s*:?\s*([A-Z0-9\-]{3,25})/i,
      /model\s*:?\s*([A-Z0-9\-]{3,25})/i,
      // Pattern like "SS-18DS", "MA-ND4", "HT-200" - prioritize dash format
      /\b([A-Z]{1,3}[-][A-Z0-9]{2,10})\b/i,
      // Pattern like "SS-18DS" or "HT-200" without dash
      /\b([A-Z]{2,5}[A-Z0-9]{2,15})\b/i,
      // Pattern with spaces: "L200 8-16-150"
      /\b([A-Z]\d{2,4}\s+[\d\-]{5,15})\b/i,
    ],
    manufacturer: [
      // Only extract if clearly visible, avoid hallucination
      /manufacturer\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
      /made\s+by\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
      /brand\s*:?\s*([A-Z][A-Z\s]{2,30})/i,
    ],
    voltage: [
      // "120 VAC" or "120V" or "24VAC"
      /(\d+)\s*VAC?/i,
      /(\d+)\s*VOLTS?/i,
      /voltage\s*:?\s*(\d+)/i,
      // Combined voltage/frequency like "24VAC 50/60Hz"
      /(\d+)\s*VAC?\s*(?:\d+\/\d+)?\s*HZ/i,
    ],
    amperage: [
      // "3.25 AMPS" or "3.25 AMPS" or "1.5VA" (apparent power, but often listed as amps)
      /(\d+\.?\d*)\s*AMPS?/i,
      /(\d+\.?\d*)\s*AMPERES?/i,
      /amperage\s*:?\s*(\d+\.?\d*)/i,
      // VA (volt-amperes) - sometimes used instead of amps
      /(\d+\.?\d*)\s*VA\b/i,
    ],
    wattage: [
      // "390 WATTS" or "390W" or "1W"
      /(\d+\.?\d*)\s*WATTS?/i,
      /(\d+\.?\d*)\s*W\b/i,
      /wattage\s*:?\s*(\d+\.?\d*)/i,
    ],
    frequency: [
      // "60 HERTZ" or "60 Hz" or "50/60Hz"
      /(\d+)\s*HERTZ/i,
      /(\d+)\s*HZ\b/i,
      /frequency\s*:?\s*(\d+)/i,
      // Combined like "50/60Hz" - extract both
      /(\d+)\/\d+\s*HZ/i,
      /\d+\/(\d+)\s*HZ/i,
    ],
    pressure: [
      // "40 PSI" or "90 PSI" or "285 PSI"
      /(\d+\.?\d*)\s*PSI/i,
      /(\d+\.?\d*)\s*psi/i,
      /pressure\s*:?\s*(\d+\.?\d*)/i,
      // CFM/SCFM patterns
      /(\d+\.?\d*)\s*SCFM/i,
      /(\d+\.?\d*)\s*CFM/i,
    ],
    cfm: [
      // "11.9-CFM" or "8.6 SCFM @ 40 PSI"
      /(\d+\.?\d*)\s*[-]?\s*CFM/i,
      /(\d+\.?\d*)\s*SCFM/i,
    ],
    torque: [
      // "18 in-lb" or "2Nm"
      /(\d+\.?\d*)\s*in[-]?lb/i,
      /(\d+\.?\d*)\s*NM/i,
      /torque\s*:?\s*(\d+\.?\d*)/i,
    ],
    time: [
      // "35s" or "35 seconds"
      /(\d+)\s*s\b/i,
      /(\d+)\s*seconds?/i,
      /time\s*:?\s*(\d+)/i,
    ],
  };
  
  // If we haven't found key fields yet, try direct extraction from full text
  if (!labels.serial_number) {
    const serial = extractSerialNumber(text);
    if (serial) labels.serial_number = serial;
  }
  
  if (!labels.model_number) {
    const model = extractModelNumber(text);
    if (model) labels.model_number = model;
  }
  
  if (!labels.manufacturer) {
    const mfr = extractManufacturer(text);
    if (mfr) labels.manufacturer = mfr;
  }
  
  // Extract numeric values from full text
  if (!labels.voltage) {
    const volt = extractNumericWithUnit(text, ['VAC', 'V', 'VOLTS'], 10, 1000);
    if (volt) labels.voltage = volt + 'V';
  }
  
  if (!labels.amperage) {
    const amp = extractNumericWithUnit(text, ['AMPS', 'A', 'AMPERES'], 0.1, 1000);
    if (amp) labels.amperage = amp;
  }
  
  if (!labels.wattage) {
    const watt = extractNumericWithUnit(text, ['WATTS', 'W'], 1, 100000);
    if (watt) labels.wattage = watt;
  }
  
  if (!labels.frequency) {
    const freq = extractNumericWithUnit(text, ['HERTZ', 'HZ'], 50, 60);
    if (freq) labels.frequency = freq + ' Hz';
  }
  
  if (!labels.pressure) {
    const press = extractNumericWithUnit(text, ['PSI', 'psi'], 0, 10000);
    if (press) labels.pressure = press;
  }
  
  // Legacy key-value extraction (fallback)
  for (const line of lines) {
    // Match "Key: Value" pattern - be more flexible with spacing and OCR errors
    // Also handle "Key Value" (without colon) and "Key=Value"
    const kvMatch = line.match(/^([^:=\s]+(?:[\s-]+[^:=\s]+)*?)\s*[:=]\s*(.+)$/i) ||
                    line.match(/^(serial|model|manufacturer|voltage|amp|watt|freq|hertz|pressure|cfm|scfm|torque|time|operating|va)\s+(number|#|no\.?)?\s*(.+)$/i);
    
    if (kvMatch) {
      const key = (kvMatch[1] || '').trim().toLowerCase();
      let value = (kvMatch[2] || kvMatch[3] || '').trim();
      
      // Clean value - fix common OCR errors
      value = value
        .replace(/\s+/g, ' ')
        .replace(/[|]/g, 'I')
        .replace(/[O0](?=[A-Z])/g, (match, offset, str) => {
          // Context: if between letters, likely O; if between numbers, likely 0
          const prev = str[offset - 1];
          const next = str[offset + 1];
          if (/[A-Z]/.test(prev) && /[A-Z]/.test(next)) return 'O';
          if (/\d/.test(prev) && /\d/.test(next)) return '0';
          return match;
        })
        .trim();
      
      if (key.includes('serial')) {
        // Extract serial number - multiple patterns
        // Remove "Number" or "No" if present
        value = value.replace(/\b(number|no|num)\b/gi, '').trim();
        
        // Try exact match first
        const exactMatch = value.match(/^([A-Z0-9]{6,20})$/i);
        if (exactMatch) {
          const serial = exactMatch[1].toUpperCase();
          if (!serial.match(/^(NUMBER|N0|NUM|NUMBER|NO)$/i)) {
            labels.serial_number = serial;
            continue; // Found, move to next line
          }
        }
        
        // Try patterns: letters+numbers or numbers+letters or pure numeric
        const patterns = [
          /([A-Z]{1,3}\d{4,15})/i,  // "18D26150"
          /(\d{4,12}[A-Z]{1,5})/i,  // "12345ABC"
          /(\d{8,15})/i,            // Pure numeric like "2002192513"
          /([A-Z0-9]{8,20})/i,      // Generic alphanumeric
        ];
        
        for (const pattern of patterns) {
          const match = value.match(pattern);
          if (match && !match[1].match(/^(NUMBER|N0|NUM|NO)$/i)) {
            labels.serial_number = match[1].toUpperCase();
            break;
          }
        }
      } else if (key.includes('model')) {
        // Extract model number - be more precise
        // Remove "Number" or "No" if present
        value = value.replace(/\b(number|no|num)\b/gi, '').trim();
        
        // Filter out common manufacturer/company words
        const excludedWords = ['CONTROLS', 'INC', 'CORP', 'LLC', 'LTD', 'COMPANY', 'MANUFACTURING', 'SYSTEMS', 'TECHNOLOGIES', 'SOLUTIONS'];
        const upperValue = value.toUpperCase();
        if (excludedWords.some(word => upperValue.includes(word) && upperValue.length < 20)) {
          // Likely a manufacturer name, not a model number
          continue;
        }
        
        if (value && value !== 'Number' && value !== 'number' && value.length >= 3) {
          // Remove leading/trailing non-alphanumeric
          let cleaned = value
            .replace(/^[^A-Z0-9]+/, '')
            .replace(/[^A-Z0-9\-]+$/, '')
            .trim();
          
          // Must contain at least one number or dash (model numbers usually have format like MA-ND4, SS-18DS)
          if (!/\d/.test(cleaned) && !cleaned.includes('-')) {
            // No numbers and no dash - likely not a model number
            continue;
          }
          
          // Try different patterns - prioritize formats with numbers/dashes
          const patterns = [
            /^([A-Z]{1,3}[-][A-Z0-9]{2,10})$/i,  // "MA-ND4", "SS-18DS" - highest priority
            /^([A-Z]{2,5}[-]?[A-Z0-9]{2,15})$/i,  // "HT-200", "SS-18DS"
            /^([A-Z]\d{2,4}[\s\-][\d\-]{5,15})$/i,  // "L200 8-16-150"
            /^([A-Z0-9\-]{3,15})$/i,  // Generic with numbers/dashes
          ];
          
          for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
              const model = match[1].toUpperCase().replace(/\s+/g, '-');
              // Double-check it's not a common word
              if (!excludedWords.includes(model) && model.length >= 3) {
                labels.model_number = model;
                break;
              }
            }
          }
        }
      } else if (key.includes('manufacturer') || key.includes('brand') || key.includes('mfg')) {
        // Only if value looks like a brand name (2+ capital letters, no numbers)
        const brandMatch = value.match(/^([A-Z][A-Z\s]{1,30})$/);
        if (brandMatch && !/\d/.test(brandMatch[1])) {
          labels.manufacturer = brandMatch[1].trim();
        }
      } else if (key.includes('voltage') || key.includes('volt') || key.includes('vac')) {
        // "120 VAC", "120V", "120 Volts"
        const voltMatch = value.match(/(\d+)\s*(?:VAC?|VOLTS?|V\b)/i);
        if (voltMatch) {
          labels.voltage = voltMatch[1] + 'V';
        } else {
          // Just a number
          const numMatch = value.match(/(\d+)/);
          if (numMatch && parseInt(numMatch[1]) >= 10 && parseInt(numMatch[1]) <= 1000) {
            labels.voltage = numMatch[1] + 'V';
          }
        }
      } else if (key.includes('amp') || key.includes('ampere') || key.includes('current')) {
        // "3.25 AMPS", "3.25A", "3.25 AMPS"
        const ampMatch = value.match(/(\d+\.?\d*)\s*(?:AMPS?|A\b|AMPERES?)/i);
        if (ampMatch) {
          labels.amperage = ampMatch[1];
        } else {
          // Just a number
          const numMatch = value.match(/(\d+\.?\d*)/);
          if (numMatch) {
            labels.amperage = numMatch[1];
          }
        }
      } else if (key.includes('watt') || key.includes('power')) {
        // "390 WATTS", "390W", "390 WATTS"
        const wattMatch = value.match(/(\d+)\s*(?:WATTS?|W\b)/i);
        if (wattMatch) {
          labels.wattage = wattMatch[1];
        } else {
          // Just a number
          const numMatch = value.match(/(\d+)/);
          if (numMatch) {
            labels.wattage = numMatch[1];
          }
        }
      } else if (key.includes('freq') || key.includes('hertz') || key.includes('hz') || key.includes('cycle')) {
        // "60 HERTZ", "60 Hz", "60Hz"
        const freqMatch = value.match(/(\d+)\s*(?:HERTZ|HZ|CYCLES?)/i);
        if (freqMatch) {
          labels.frequency = freqMatch[1] + ' Hz';
        } else {
          // Just a number (likely frequency)
          const numMatch = value.match(/(\d+)/);
          if (numMatch && (parseInt(numMatch[1]) === 50 || parseInt(numMatch[1]) === 60)) {
            labels.frequency = numMatch[1] + ' Hz';
          }
        }
      } else if (key.includes('pressure') || key.includes('psi')) {
        // "285 PSI", "285psi", "285 PSI"
        const pressMatch = value.match(/(\d+\.?\d*)\s*(?:PSI|psi)/i);
        if (pressMatch) {
          labels.pressure = pressMatch[1];
        } else {
          // Just a number
          const numMatch = value.match(/(\d+\.?\d*)/);
          if (numMatch) {
            labels.pressure = numMatch[1];
          }
        }
      } else if (key.includes('cfm') || key.includes('scfm')) {
        // "11.9-CFM" or "8.6 SCFM"
        const cfmMatch = value.match(/(\d+\.?\d*)\s*[-]?\s*(?:SCFM|CFM)/i);
        if (cfmMatch) {
          labels.cfm = cfmMatch[1];
        }
      } else if (key.includes('torque')) {
        // "18 in-lb" or "2Nm"
        const torqueMatch = value.match(/(\d+\.?\d*)\s*(?:in[-]?lb|NM)/i);
        if (torqueMatch) {
          labels.torque = torqueMatch[1];
        }
      } else if (key.includes('time') || key.includes('operating')) {
        // "35s" or "35 seconds"
        const timeMatch = value.match(/(\d+)\s*(?:s|seconds?)/i);
        if (timeMatch) {
          labels.time = timeMatch[1] + 's';
        }
      } else if (key.includes('va') && !key.includes('vac')) {
        // "1.5VA" (volt-amperes)
        const vaMatch = value.match(/(\d+\.?\d*)\s*VA\b/i);
        if (vaMatch) {
          labels.va = vaMatch[1];
        }
      }
    }
  }
  
  // Then try regex patterns on full text (for cases without colons)
  for (const [key, patternList] of Object.entries(patterns)) {
    // Skip if already found from key-value extraction
    if (labels[key]) continue;
    
    for (const pattern of patternList) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        // Validate the extracted value
        if (key === 'serial_number' && /^[A-Z0-9]{6,15}$/i.test(value)) {
          labels[key] = value;
          break;
        } else if (key === 'model_number' && /^[A-Z0-9\-]{3,20}$/i.test(value)) {
          labels[key] = value;
          break;
        } else if (key === 'manufacturer' && /^[A-Z][A-Z\s]{1,30}$/i.test(value)) {
          labels[key] = value;
          break;
        } else if (key !== 'serial_number' && key !== 'model_number' && key !== 'manufacturer') {
          labels[key] = value;
          break;
        }
      }
    }
  }
  
  // Extract from full text if not found in key-value pairs
  // Extract voltage + frequency together (e.g., "120 VAC 60 Hertz")
  if (!labels.voltage || !labels.frequency) {
    const voltageFreqMatch = fullText.match(/(\d+)\s*VAC?\s*(\d+)\s*HERTZ/i);
    if (voltageFreqMatch) {
      if (!labels.voltage) labels.voltage = voltageFreqMatch[1] + 'V';
      if (!labels.frequency) labels.frequency = voltageFreqMatch[2] + ' Hz';
    }
  }
  
  // Extract standalone values from full text
  // "120 VAC" or "120V" or "120 VOLTS"
  if (!labels.voltage) {
    const voltMatch = fullText.match(/(\d{2,4})\s*(?:VAC?|VOLTS?|V\b)/i);
    if (voltMatch) {
      const volts = parseInt(voltMatch[1]);
      if (volts >= 10 && volts <= 1000) {
        labels.voltage = voltMatch[1] + 'V';
      }
    }
  }
  
  // "60 Hertz" or "60 Hz" or "60HZ"
  if (!labels.frequency) {
    const freqMatch = fullText.match(/(\d+)\s*(?:HERTZ|HZ|CYCLES?)/i);
    if (freqMatch) {
      const freq = parseInt(freqMatch[1]);
      if (freq === 50 || freq === 60) {
        labels.frequency = freqMatch[1] + ' Hz';
      }
    }
  }
  
  // "3.25 AMPS" or "3.25A" or "3.25 AMPS"
  if (!labels.amperage) {
    const ampMatch = fullText.match(/(\d+\.?\d*)\s*(?:AMPS?|A\b|AMPERES?)/i);
    if (ampMatch) {
      labels.amperage = ampMatch[1];
    }
  }
  
  // "390 WATTS" or "390W" or "390 WATTS" or "1W"
  if (!labels.wattage) {
    const wattMatch = fullText.match(/(\d+\.?\d*)\s*(?:WATTS?|W\b)/i);
    if (wattMatch) {
      labels.wattage = wattMatch[1];
    }
  }
  
  // Extract CFM/SCFM
  if (!labels.cfm) {
    const cfmMatch = fullText.match(/(\d+\.?\d*)\s*[-]?\s*(?:SCFM|CFM)/i);
    if (cfmMatch) {
      labels.cfm = cfmMatch[1];
    }
  }
  
  // Extract torque
  if (!labels.torque) {
    const torqueMatch = fullText.match(/(\d+\.?\d*)\s*(?:in[-]?lb|NM)/i);
    if (torqueMatch) {
      labels.torque = torqueMatch[1];
    }
  }
  
  // Extract time/operating time
  if (!labels.time) {
    const timeMatch = fullText.match(/(\d+)\s*s\b/i);
    if (timeMatch) {
      labels.time = timeMatch[1] + 's';
    }
  }
  
  // Extract combined voltage/frequency like "24VAC 50/60Hz"
  if (!labels.voltage || !labels.frequency) {
    const combinedMatch = fullText.match(/(\d+)\s*VAC?\s*(\d+)\/?(\d+)?\s*HZ/i);
    if (combinedMatch) {
      if (!labels.voltage) labels.voltage = combinedMatch[1] + 'V';
      if (!labels.frequency && combinedMatch[2]) {
        labels.frequency = combinedMatch[2] + (combinedMatch[3] ? '/' + combinedMatch[3] : '') + ' Hz';
      }
    }
  }
  
  // Extract VA (volt-amperes) - sometimes listed separately
  if (!labels.amperage && !labels.va) {
    const vaMatch = fullText.match(/(\d+\.?\d*)\s*VA\b/i);
    if (vaMatch) {
      labels.va = vaMatch[1];
    }
  }
  
      // Extract serial/model from full text if not found
      if (!labels.serial_number) {
        // Look for patterns in full text - prioritize "SER NO" format
        const serialPatterns = [
          /(?:SERIAL|SER)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z0-9]{6,20})/i,
          /(?:SERIAL|SER)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*(\d{8,15})/i,  // Long numeric serials
          /(?:S\/N|SN)\s*:?\s*([A-Z0-9]{6,20})/i,
          /\b([A-Z]{1,3}\d{4,15})\b/,  // "18D26150"
          /\b(\d{8,15})\b(?=.*(?:SERIAL|SER|S\/N|SN))/i,  // Pure numeric near serial keyword
          /\b(\d{4,12}[A-Z]{1,5})\b/,  // "12345ABC"
        ];
        
        for (const pattern of serialPatterns) {
          const match = fullText.match(pattern);
          if (match && match[1] && !match[1].match(/^(NUMBER|N0|NUM|NO)$/i)) {
            labels.serial_number = match[1].toUpperCase();
            break;
          }
        }
      }
  
      if (!labels.model_number) {
        // Look for model patterns in full text
        const excludedWords = ['CONTROLS', 'INC', 'CORP', 'LLC', 'LTD', 'COMPANY', 'MANUFACTURING', 'SYSTEMS'];
        const modelPatterns = [
          /(?:MODEL|MOD)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z]{1,3}[-][A-Z0-9]{2,10})/i,  // "MA-ND4" format - highest priority
          /(?:MODEL|MOD)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z]{2,5}[-]?[A-Z0-9]{2,15})/i,  // "SS-18DS" format
          /(?:MODEL|MOD)\s*(?:NUMBER|#|NO\.?)?\s*:?\s*([A-Z0-9\-]{3,15})/i,  // Generic with numbers
          /\b([A-Z]{1,3}[-][A-Z0-9]{2,10})\b/,  // "MA-ND4", "SS-18DS" - standalone (dash format)
          /\b([A-Z]{2,5}[-][A-Z0-9]{2,15})\b/,  // "SS-18DS" with dash
          /\b([A-Z]{2,5}[A-Z0-9]{2,15})\b/,  // Without dash
        ];
        
        for (const pattern of modelPatterns) {
          const match = fullText.match(pattern);
          if (match && match[1]) {
            const candidate = match[1].toUpperCase().replace(/\s+/g, '-');
            // Must have numbers or dash, and not be an excluded word
            if ((/\d/.test(candidate) || candidate.includes('-')) && 
                !excludedWords.some(word => candidate.includes(word)) &&
                candidate.length >= 3 && 
                candidate.length <= 15 &&
                candidate !== 'NUMBER') {
              labels.model_number = candidate;
              break;
            }
          }
        }
      }
  
  // Clean up labels - remove empty or invalid values
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(labels)) {
    if (value && 
        value.length > 0 && 
        value !== 'Number' && 
        value !== 'number' &&
        !value.match(/^(number|Number|NUMBER)$/i)) {
      cleaned[key] = value;
    }
  }
  
  console.log('Extracted labels:', cleaned);
  return cleaned;
}

export function extractTextBlocks(ocrResult: OCRResult): Array<{ text: string; bbox: [number, number, number, number] }> {
  return ocrResult.words
    .filter(word => word.text.trim().length > 0 && word.confidence > 30)
    .map(word => ({
      text: word.text,
      bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1] as [number, number, number, number],
    }));
}

