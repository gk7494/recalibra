# TerraCheck - Local-First AI Inspection System

**On-device AI for field inspection teams in construction, energy, and utilities.**

TerraCheck is a complete local-first AI inspection system that processes images and text entirely on-device. Perfect for offline or restricted environments where cloud AI is not allowed.

## 🎯 Key Features

### 1. **On-Device Vision AI (Fully Offline)**
- All processing runs locally on the device
- No cloud calls, no external servers
- Works in air-gapped environments
- Zero data leaves the device

### 2. **Industrial-Grade OCR**
- Extracts text from equipment labels, nameplates, and tags
- Handles messy surfaces and poor lighting
- Extracts structured data:
  - Serial numbers
  - Model numbers
  - Manufacturer information
  - Voltage, amperage, wattage
  - Pressure, temperature readings
  - Handwritten notes

### 3. **Defect Detection Engine**
- Detects physical defects using computer vision:
  - **Cracks**: Linear patterns and fractures
  - **Corrosion**: Dark discolored regions
  - **Misalignment**: Irregular edge patterns
  - **Deformation**: Surface warping and bending
  - **Missing components**: Gap detection
  - **Foreign objects**: Anomaly detection

### 4. **Automatic Report Generation**
- Auto-filled inspection reports
- Multiple export formats:
  - **PDF**: Professional formatted reports
  - **Word**: Editable DOCX documents
  - **Excel/CSV**: Data tables for analysis
- Includes extracted data, detected issues, and photos

### 5. **Field Worker-Friendly Interface**
- Camera-first workflow
- Simple 3-column layout (Drafts → Processing → Completed)
- Instant feedback and progress tracking
- Works on mobile devices and tablets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Modern browser with camera access

### Installation

```bash
cd terracheck-client-only/frontend
npm install
npm run dev
```

The app will open at `http://localhost:5173`

### Usage

1. **Capture or Upload Images**
   - Click "📷 Camera" to use device camera
   - Or click "📁 Upload" to select files

2. **Start Processing**
   - Click the play button on a draft inspection
   - System processes images locally (OCR + defect detection)

3. **View Results**
   - Click "Info" to see detailed analysis
   - View extracted labels, detected issues, and summary

4. **Export Reports**
   - Click PDF, Word, or Excel buttons in the info modal
   - Reports are generated and downloaded locally

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **OCR**: Tesseract.js (client-side)
- **Defect Detection**: Canvas-based computer vision
- **Storage**: IndexedDB (browser database)
- **Export**: jsPDF, docx, file-saver

### Key Components

- **`ocr.ts`**: Advanced OCR with multiple PSM modes and text cleaning
- **`defectDetection.ts`**: Computer vision algorithms for defect detection
- **`reportGenerator.ts`**: Professional report generation (PDF/Word/Excel)
- **`inference.ts`**: Orchestrates OCR and defect detection
- **`InspectPage.tsx`**: Main 3-column workflow UI
- **`CameraCapture.tsx`**: Camera integration for field workers

## 📋 Inspection Workflow

1. **Draft**: Upload/capture images → Create draft inspection
2. **Processing**: AI analyzes images → Extracts text → Detects defects
3. **Completed**: View results → Export reports

## 🔒 Privacy & Security

- **100% Local Processing**: No data sent to external servers
- **No Cloud Dependencies**: Works completely offline
- **Data Stays on Device**: All data stored in browser IndexedDB
- **Export Control**: Reports exported locally, no uploads

## 🎯 Use Cases

- **Construction**: Equipment inspections, safety checks
- **Energy**: Power plant inspections, equipment maintenance
- **Utilities**: Infrastructure inspections, compliance reporting
- **Manufacturing**: Quality control, equipment monitoring

## 📱 Mobile Support

- Responsive design works on phones and tablets
- Camera integration for field use
- Touch-friendly interface
- Offline-first architecture

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📄 License

Proprietary - All rights reserved

---

**Built for field inspection teams who need reliable, offline AI-powered inspection tools.**
