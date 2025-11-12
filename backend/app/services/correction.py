"""Correction layer training and application"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict, Optional
from app.core.config import settings


def train_correction_layer(df: pd.DataFrame, model_id: str) -> Dict:
    """
    Train a Ridge regression correction layer.
    df must contain columns: ['y_pred', 'y_true', 'reagent_batch', 'instrument_id']
    """
    # Drop rows with missing critical data
    df = df.dropna(subset=["y_pred", "y_true"]).copy()
    
    if len(df) < 10:
        raise ValueError(f"Insufficient data for training: {len(df)} samples (need at least 10)")
    
    # Prepare features
    X = df[["y_pred", "reagent_batch", "instrument_id"]].copy()
    y = df["y_true"].values
    
    # Fill missing categorical values
    X["reagent_batch"] = X["reagent_batch"].fillna("unknown")
    X["instrument_id"] = X["instrument_id"].fillna("unknown")
    
    # Define feature types
    numeric_features = ["y_pred"]
    cat_features = ["reagent_batch", "instrument_id"]
    
    # Create preprocessing pipeline
    preproc = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
        ],
        remainder="drop"
    )
    
    # Create model pipeline
    model = Ridge(alpha=1.0)
    pipe = Pipeline(steps=[
        ("preprocess", preproc),
        ("model", model),
    ])
    
    # Train
    pipe.fit(X, y)
    
    # Evaluate on training data
    y_pred_corr = pipe.predict(X)
    mae = mean_absolute_error(y, y_pred_corr)
    rmse = np.sqrt(mean_squared_error(y, y_pred_corr))
    r2 = r2_score(y, y_pred_corr)
    
    # Save model
    os.makedirs(settings.CORRECTION_DIR, exist_ok=True)
    path = os.path.join(settings.CORRECTION_DIR, f"{model_id}_correction.joblib")
    joblib.dump(pipe, path)
    
    print(f"✅ Trained correction layer for {model_id}: MAE={mae:.3f}, RMSE={rmse:.3f}, R²={r2:.3f}")
    
    return {
        "model_id": model_id,
        "file_path": path,
        "mae": float(mae),
        "rmse": float(rmse),
        "r_squared": float(r2),
        "training_samples": len(df),
    }


def load_correction_layer(model_id: str) -> Optional[Pipeline]:
    """Load a trained correction layer"""
    path = os.path.join(settings.CORRECTION_DIR, f"{model_id}_correction.joblib")
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def apply_correction(model_id: str, rows: pd.DataFrame) -> np.ndarray:
    """
    Apply correction layer to predictions.
    rows: DataFrame with columns ['y_pred', 'reagent_batch', 'instrument_id']
    Returns corrected predictions
    """
    pipe = load_correction_layer(model_id)
    if pipe is None:
        raise ValueError(f"No correction model found for {model_id}")
    
    # Prepare input
    X = rows[["y_pred", "reagent_batch", "instrument_id"]].copy()
    X["reagent_batch"] = X["reagent_batch"].fillna("unknown")
    X["instrument_id"] = X["instrument_id"].fillna("unknown")
    
    return pipe.predict(X)








