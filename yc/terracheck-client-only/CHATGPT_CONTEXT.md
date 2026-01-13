# TerraCheck - Project Context for ChatGPT

## Project Overview

**TerraCheck** is a local-first, on-device AI inspection assistant for field inspectors. It runs entirely in the browser (client-side only) using IndexedDB for storage and Tesseract.js for OCR. No backend server required.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB (via `idb` library)
- **OCR**: Tesseract.js (browser-based)
- **Defect Detection**: Canvas-based computer vision (Sobel edge detection, color analysis)
- **State Management**: React hooks + localStorage

## Project Structure

```
terracheck-client-only/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # Analytics dashboard
│   │   │   ├── InspectPage.tsx        # Main 3-column inspection workflow
│   │   │   ├── EquipmentPage.tsx      # Equipment database
│   │   │   └── TemplatesPage.tsx      # Inspection templates
│   │   ├── components/
│   │   │   ├── InspectionCard.tsx     # Card component for inspections
│   │   │   ├── InfoModal.tsx          # Modal showing inspection details
│   │   │   ├── CameraCapture.tsx      # Camera integration
│   │   │   └── Navigation.tsx         # Main navigation bar
│   │   ├── utils/
│   │   │   ├── imagePreprocessing.ts  # Image preprocessing for OCR/defects
│   │   │   ├── defectDetection.ts     # Crack/corrosion detection algorithms
│   │   │   └── batchProcessor.ts      # Batch processing utilities
│   │   ├── db.ts                      # IndexedDB operations
│   │   ├── ocr.ts                     # Tesseract.js OCR wrapper
│   │   ├── inference.ts               # Main inference pipeline
│   │   └── App.tsx                    # Root component with navigation
```

## Core Features

### 1. Inspection Workflow (3-Column Layout)
- **Drafts**: Upload images, create draft inspections
- **Processing**: Background processing with progress bars
- **Completed/Failed**: View results, extracted data, detected issues

### 2. OCR Text Extraction
- Uses Tesseract.js with multiple PSM modes
- Image preprocessing (grayscale, contrast enhancement, sharpening)
- Extracts: serial numbers, model numbers, manufacturer, voltage, amperage, etc.
- Advanced text cleaning and error correction

### 3. Defect Detection
- **Crack Detection**: Sobel edge detection + linear pattern matching
- **Corrosion Detection**: Color analysis (dark regions with reddish tints)
- Filters to top 5 most significant defects
- Confidence scoring and severity classification

### 4. Templates System
- Create/edit inspection templates
- Predefined fields (serial_number, model_number, etc.)
- Use templates to create new inspections
- Stored in localStorage

### 5. Equipment Database
- Auto-extracts equipment from completed inspections
- Tracks serial numbers, model numbers, inspection history
- Status tracking (operational, needs_attention, critical)

## Data Model

### Inspection
```typescript
interface Inspection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  progress: number;
  issuesFound: number | null;
  summaryText: string | null;
  confidence: number | null;
  result: TerraCheckResult | null;
  failureReason: string | null;
  imageIds: string[];
}
```

### TerraCheckResult
```typescript
interface TerraCheckResult {
  text_blocks: Array<{ text: string; bbox: [number, number, number, number] }>;
  tables: Array<{ title: string | null; table_markdown: string }>;
  labels: Record<string, string>;  // serial_number, model_number, etc.
  detected_issues: Array<{
    type: string;
    description: string;
    bbox: [number, number, number, number];
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }>;
  overall_summary: {
    issues_found: number;
    confidence: number;
    summary_text: string;
  };
}
```

## Current Implementation Status

### ✅ Working Features
- Image upload and storage (IndexedDB)
- OCR text extraction with preprocessing
- Defect detection (cracks, corrosion)
- 3-column inspection workflow
- Templates system (create, edit, use, delete)
- Equipment database
- Dashboard with statistics
- Batch processing
- Search and filtering

### ⚠️ Known Issues / Areas for Improvement

1. **OCR Accuracy**
   - May struggle with poor lighting or low-quality images
   - Serial number extraction could be more robust
   - Handwritten text not well supported

2. **Defect Detection**
   - Conservative thresholds (may miss subtle defects)
   - Limited to cracks and corrosion
   - No machine learning - purely heuristic-based

3. **Performance**
   - OCR can be slow on large images (15-25 seconds)
   - Defect detection runs synchronously
   - No image compression/optimization

4. **User Experience**
   - No undo/redo functionality
   - Limited error messages
   - No export to PDF/Word yet (mentioned but not fully implemented)

## Key Files to Understand

1. **`db.ts`**: All IndexedDB operations (create, read, update, delete inspections/images)
2. **`ocr.ts`**: OCR extraction with preprocessing and text cleaning
3. **`inference.ts`**: Main pipeline that orchestrates OCR + defect detection
4. **`defectDetection.ts`**: Computer vision algorithms for crack/corrosion detection
5. **`InspectPage.tsx`**: Main UI component with 3-column workflow
6. **`imagePreprocessing.ts`**: Image enhancement for better OCR/defect detection

## How It Works

1. **User uploads images** → Stored in IndexedDB as Blobs
2. **User clicks "Start Processing"** → Status changes to "processing"
3. **Background processing**:
   - Image preprocessing (grayscale, contrast, sharpening)
   - OCR extraction (Tesseract.js with multiple PSM modes)
   - Label extraction (regex patterns for serial/model numbers)
   - Defect detection (Sobel edges, color analysis)
4. **Results stored** → Inspection status → "completed"
5. **User views results** → Info modal shows extracted labels, detected issues, summary

## Development Commands

```bash
cd terracheck-client-only/frontend
npm run dev    # Start dev server (http://localhost:5173)
npm run build  # Build for production
```

## Current Issue Context

If you're experiencing a specific issue, please describe:
- What feature/page you're on
- What action you're trying to perform
- What error message (if any) you see
- Expected vs actual behavior

The codebase is fully client-side, so all processing happens in the browser. No API calls, no backend server needed.


