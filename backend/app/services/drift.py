"""Drift detection using KS test and PSI"""
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.db.models import ModelPrediction, AssayResult
from app.core.config import settings


def compute_psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """Population Stability Index between two distributions"""
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
    
    # Create bins based on combined range
    min_val = min(expected.min(), actual.min())
    max_val = max(expected.max(), actual.max())
    
    if abs(max_val - min_val) < 1e-10:
        return 0.0
    
    bin_edges = np.linspace(min_val, max_val, bins + 1)
    
    expected_hist, _ = np.histogram(expected, bins=bin_edges)
    actual_hist, _ = np.histogram(actual, bins=bin_edges)
    
    # Normalize to probabilities
    expected_perc = expected_hist / (expected_hist.sum() + 1e-10)
    actual_perc = actual_hist / (actual_hist.sum() + 1e-10)
    
    # Calculate PSI
    psi = 0.0
    for e, a in zip(expected_perc, actual_perc):
        # Avoid log(0)
        if e > 0 and a > 0:
            psi += (a - e) * np.log(a / e)
    
    return abs(psi)  # PSI is always positive


def get_training_frame(db: Session, model_id: str) -> Optional[pd.DataFrame]:
    """
    Join model predictions with assay results to create training frame.
    Returns DataFrame with columns: [y_pred, y_true, reagent_batch, 
    instrument_id, assay_version, run_timestamp, molecule_id]
    """
    # Get predictions for this model
    predictions = db.query(ModelPrediction).filter(
        ModelPrediction.model_id == model_id
    ).all()
    
    if not predictions:
        return None
    
    # Get matching assay results
    molecule_ids = [p.molecule_id for p in predictions]
    results = db.query(AssayResult).filter(
        AssayResult.molecule_id.in_(molecule_ids)
    ).all()
    
    if not results:
        return None
    
    # Create dictionaries for joining
    # Try exact match first (molecule_id + assay_version)
    pred_dict = {(p.molecule_id, p.assay_version or ""): p for p in predictions}
    result_dict = {(r.molecule_id, r.assay_version or ""): r for r in results}
    
    # Also create molecule_id-only dict for fallback matching
    pred_dict_by_mol = {p.molecule_id: p for p in predictions}
    result_dict_by_mol = {r.molecule_id: r for r in results}
    
    # Track which results we've used
    used_results = set()
    
    # Join on molecule_id and assay_version (preferred)
    rows = []
    for (mol_id, assay_ver), pred in pred_dict.items():
        key = (mol_id, assay_ver)
        if key in result_dict:
            result = result_dict[key]
            rows.append({
                "molecule_id": mol_id,
                "y_pred": pred.y_pred,
                "y_true": result.y_true,
                "reagent_batch": result.reagent_batch or pred.reagent_batch,
                "instrument_id": result.instrument_id or pred.instrument_id,
                "assay_version": assay_ver or "v1",
                "run_timestamp": result.run_timestamp or pred.run_timestamp,
            })
            used_results.add((mol_id, assay_ver))
    
    # Fallback: match by molecule_id only if assay_version didn't match
    for mol_id, pred in pred_dict_by_mol.items():
        if mol_id in result_dict_by_mol:
            # Check if we already matched this molecule
            already_matched = any(r["molecule_id"] == mol_id for r in rows)
            if not already_matched:
                result = result_dict_by_mol[mol_id]
                rows.append({
                    "molecule_id": mol_id,
                    "y_pred": pred.y_pred,
                    "y_true": result.y_true,
                    "reagent_batch": result.reagent_batch or pred.reagent_batch,
                    "instrument_id": result.instrument_id or pred.instrument_id,
                    "assay_version": result.assay_version or pred.assay_version or "v1",
                    "run_timestamp": result.run_timestamp or pred.run_timestamp,
                })
    
    if not rows:
        return None
    
    df = pd.DataFrame(rows)
    
    # Ensure run_timestamp is datetime
    if df["run_timestamp"].dtype == 'object':
        df["run_timestamp"] = pd.to_datetime(df["run_timestamp"], errors='coerce')
    
    return df


def detect_drift(df: pd.DataFrame, cutoff_days: int = None) -> Dict:
    """
    Detect drift by comparing baseline vs recent windows.
    df must have columns: ['run_timestamp', 'y_pred', 'y_true']
    """
    if cutoff_days is None:
        cutoff_days = settings.DRIFT_CUTOFF_DAYS
    
    if df is None or len(df) == 0:
        return {"enough_data": False, "drift_detected": "NO"}
    
    # Sort by timestamp
    df = df.sort_values("run_timestamp").copy()
    
    if df["run_timestamp"].isna().all():
        # If no timestamps, use all data as recent
        recent = df
        baseline = df.iloc[:len(df)//2] if len(df) > 1 else df
    else:
        # Split into baseline and recent windows
        # For MVP: use first half as baseline, second half as recent
        # This ensures drift detection works even when all data is from same time period
        mid_point = len(df) // 2
        baseline = df.iloc[:mid_point] if mid_point > 0 else df.iloc[:len(df)//2]
        recent = df.iloc[mid_point:] if mid_point < len(df) else df.iloc[len(df)//2:]
        
        # Fallback: if split didn't work, try time-based split
        if len(baseline) == 0 or len(recent) == 0:
            max_time = df["run_timestamp"].max()
            cutoff_time = max_time - pd.Timedelta(days=cutoff_days)
            recent = df[df["run_timestamp"] >= cutoff_time]
            baseline = df[df["run_timestamp"] < cutoff_time]
    
    # Need sufficient data in both windows
    if len(baseline) < 10 or len(recent) < 10:
        return {
            "enough_data": False,
            "drift_detected": "NO",
            "baseline_samples": len(baseline),
            "recent_samples": len(recent)
        }
    
    # Compare distributions of y_true (actual measured values)
    baseline_values = baseline["y_true"].values
    recent_values = recent["y_true"].values
    
    # KS test
    ks_stat, ks_p = ks_2samp(baseline_values, recent_values)
    
    # PSI
    psi = compute_psi(baseline_values, recent_values)
    
    # Determine drift
    drift_detected = (
        ks_p < settings.KS_THRESHOLD or  # Significant distribution difference
        psi > settings.PSI_THRESHOLD  # Significant population shift
    )
    
    return {
        "enough_data": True,
        "drift_detected": "YES" if drift_detected else "NO",
        "ks_stat": float(ks_stat),
        "ks_p": float(ks_p),
        "psi": float(psi),
        "baseline_samples": len(baseline),
        "recent_samples": len(recent),
        "baseline_mean": float(baseline_values.mean()),
        "recent_mean": float(recent_values.mean()),
    }
