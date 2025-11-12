# Sample Data for Recalibra

This directory contains CSV files with sample data for testing Recalibra.

## Files

1. **molecules.csv** - 20 sample molecules with:
   - IDs, names, compound IDs
   - SMILES strings
   - Molecular formulas and weights
   - CAS numbers

2. **experimental_results.csv** - Experimental IC50 measurements:
   - 20 results from assay_001 (BATCH-2024-001)
   - 10 results from assay_002 (BATCH-2024-002) - showing drift!
   - Includes reagent batches, instruments, operators, dates

3. **predictions.csv** - Model predictions from MOE:
   - 20 predictions for all molecules
   - Docking scores and confidence values
   - GBVI/WSA method

## How to Import

### Option 1: Import all at once
```bash
cd sample_data
python3 import_csv.py all
```

### Option 2: Import individually
```bash
cd sample_data
python3 import_csv.py molecules.csv
python3 import_csv.py experimental_results.csv
python3 import_csv.py predictions.csv
```

### Option 3: Using the backend venv
```bash
cd sample_data
../backend/venv/bin/python3 import_csv.py all
```

## What This Data Shows

The sample data is designed to demonstrate drift detection:

1. **Initial data (assay_001)**: Predictions and experimental results are well-aligned
2. **Drift data (assay_002)**: New reagent batch (BATCH-2024-002) shows systematic shift
   - Experimental values are ~1.5-2.0 μM higher than predictions
   - This simulates real-world drift from reagent batch changes

## After Import

Once imported, you can:
1. Check for drift: `POST /api/drift/check/{model_id}`
2. View metrics: `GET /api/models/{model_id}/metrics`
3. Retrain model: `POST /api/models/{model_id}/retrain`

## Data Details

- **Molecules**: 20 compounds with realistic biotech structures
- **Experimental Results**: 30 total measurements (20 + 10)
- **Predictions**: 20 predictions from MOE docking model
- **Drift Scenario**: Assay 002 shows systematic bias due to reagent batch change

