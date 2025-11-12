"""
MOE prediction ingestion from CSV.

This module provides functions to load MOE docking predictions from CSV files
exported from MOE and normalize them into our database format.

Expected CSV format:
    molecule_id,model_id,docking_score,reagent_batch,assay_version,instrument_id,run_timestamp
    CMPD_001,enzyme_52,-8.73,RB_92,v3,LCMS_01,2025-11-10T16:20:00Z
    CMPD_002,enzyme_52,-7.45,RB_92,v3,LCMS_01,2025-11-10T16:20:00Z
"""
import csv
import logging
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from app.core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

# Required CSV columns
REQUIRED_COLUMNS = ["molecule_id", "model_id", "docking_score"]


def load_moe_predictions_from_csv(path: str) -> List[Dict]:
    """
    Load MOE predictions from CSV file exported from MOE docking results.
    
    Reads a CSV file and returns a list of dictionaries with normalized data.
    Validates that required columns are present.
    
    Args:
        path: Path to the CSV file
    
    Returns:
        List of dictionaries with keys:
        - molecule_id: Molecule identifier
        - model_id: Model identifier (e.g., "enzyme_52")
        - y_pred: Predicted value (docking score converted to positive IC50 estimate)
        - reagent_batch: Reagent batch ID (optional)
        - assay_version: Assay version (optional)
        - instrument_id: Instrument ID (optional)
        - run_timestamp: When the prediction was generated (optional)
        - metadata_json: Additional metadata including source file path
    
    Raises:
        ValueError: If CSV format is invalid or required columns are missing
        FileNotFoundError: If CSV file does not exist
    """
    # Validate file exists
    csv_path = Path(path)
    if not csv_path.exists():
        error_msg = f"MOE CSV file not found: {path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    
    rows = []
    
    try:
        # Open and read CSV file
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            
            # Validate CSV has required columns
            if not reader.fieldnames:
                raise ValueError("CSV file is empty or has no header row")
            
            missing_columns = [col for col in REQUIRED_COLUMNS if col not in reader.fieldnames]
            if missing_columns:
                error_msg = f"Invalid CSV format: Missing required columns: {', '.join(missing_columns)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Parse each row
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
                try:
                    # Parse timestamp if present
                    run_timestamp = None
                    if row.get("run_timestamp"):
                        try:
                            # Handle ISO format timestamps
                            timestamp_str = row["run_timestamp"].replace("Z", "+00:00")
                            run_timestamp = datetime.fromisoformat(timestamp_str)
                        except ValueError as e:
                            logger.warning(f"Row {row_num}: Invalid timestamp format: {row['run_timestamp']}")
                    
                    # Extract docking score (can be negative, we'll use absolute value for IC50 estimate)
                    docking_score = row.get("docking_score") or row.get("y_pred")
                    if not docking_score:
                        logger.warning(f"Row {row_num}: Missing docking_score, skipping")
                        continue
                    
                    # Convert docking score to predicted value
                    # MOE docking scores are typically negative (lower = better binding)
                    # We convert to positive IC50 estimate for consistency
                    y_pred = abs(float(docking_score))
                    
                    # Create normalized dictionary
                    rows.append({
                        "molecule_id": row.get("molecule_id", "").strip(),
                        "model_id": row.get("model_id", "").strip(),
                        "y_pred": y_pred,
                        "reagent_batch": row.get("reagent_batch", "").strip() or None,
                        "assay_version": row.get("assay_version", "").strip() or None,
                        "instrument_id": row.get("instrument_id", "").strip() or None,
                        "run_timestamp": run_timestamp,
                        "metadata_json": {
                            "source": "MOE CSV",
                            "file_path": str(path),
                            "docking_score": float(docking_score),
                            "raw_row": row
                        }
                    })
                except (ValueError, KeyError) as e:
                    logger.warning(f"Row {row_num}: Error parsing row: {e}, skipping")
                    continue
        
        logger.info(f"Successfully loaded {len(rows)} predictions from MOE CSV: {path}")
        return rows
    
    except (FileNotFoundError, ValueError) as e:
        # Re-raise validation errors
        raise
    except Exception as e:
        error_msg = f"Error loading MOE CSV: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg)


def ingest_moe_from_file_path(file_path: Optional[str] = None) -> List[Dict]:
    """Ingest MOE predictions from configured path or provided path"""
    path = file_path or settings.MOE_CSV_PATH
    return load_moe_predictions_from_csv(path)

