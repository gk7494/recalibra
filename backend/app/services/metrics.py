"""Metrics calculation service"""
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from typing import List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.record import Record


def calculate_metrics(predictions: List[float], actuals: List[float]) -> dict:
    """
    Calculate RMSE, MAE, and R² metrics.
    
    Args:
        predictions: List of predicted values
        actuals: List of observed values
        
    Returns:
        Dictionary with rmse, mae, r_squared, and n_samples
    """
    if len(predictions) != len(actuals):
        raise ValueError("Predictions and actuals must have the same length")
    
    if len(predictions) == 0:
        raise ValueError("Cannot calculate metrics on empty data")
    
    predictions_arr = np.array(predictions)
    actuals_arr = np.array(actuals)
    
    rmse = np.sqrt(mean_squared_error(actuals_arr, predictions_arr))
    mae = mean_absolute_error(actuals_arr, predictions_arr)
    r_squared = r2_score(actuals_arr, predictions_arr)
    
    return {
        "rmse": float(rmse),
        "mae": float(mae),
        "r_squared": float(r_squared),
        "n_samples": len(predictions)
    }


def calculate_metrics_by_time_buckets(
    db: Session,
    model_id: str,
    bucket_size: str = "week"
) -> dict:
    """
    Calculate metrics grouped by time buckets (e.g., weekly).
    
    Args:
        db: Database session
        model_id: Model ID to calculate metrics for
        bucket_size: Time bucket size ("day", "week", "month")
        
    Returns:
        Dictionary with time_buckets, rmse, mae, r_squared, n_samples lists
    """
    # Get all records for this model through datasets
    from app.models.dataset import Dataset
    
    datasets = db.query(Dataset).filter(Dataset.model_id == model_id).all()
    dataset_ids = [d.id for d in datasets]
    
    if not dataset_ids:
        return {
            "time_buckets": [],
            "rmse": [],
            "mae": [],
            "r_squared": [],
            "n_samples": []
        }
    
    records = db.query(Record).filter(
        Record.dataset_id.in_(dataset_ids)
    ).order_by(Record.timestamp).all()
    
    if not records:
        return {
            "time_buckets": [],
            "rmse": [],
            "mae": [],
            "r_squared": [],
            "n_samples": []
        }
    
    # Convert to DataFrame for easier time bucketing
    df = pd.DataFrame([{
        "timestamp": r.timestamp,
        "prediction": r.prediction_value,
        "observed": r.observed_value
    } for r in records])
    
    # Set timestamp as index
    df.set_index("timestamp", inplace=True)
    
    # Group by time bucket
    if bucket_size == "day":
        grouped = df.groupby(pd.Grouper(freq="D"))
    elif bucket_size == "week":
        grouped = df.groupby(pd.Grouper(freq="W"))
    elif bucket_size == "month":
        grouped = df.groupby(pd.Grouper(freq="M"))
    else:
        raise ValueError(f"Invalid bucket_size: {bucket_size}. Must be 'day', 'week', or 'month'")
    
    time_buckets = []
    rmse_list = []
    mae_list = []
    r_squared_list = []
    n_samples_list = []
    
    for bucket_time, group in grouped:
        if len(group) == 0:
            continue
        
        predictions = group["prediction"].tolist()
        actuals = group["observed"].tolist()
        
        metrics = calculate_metrics(predictions, actuals)
        
        time_buckets.append(bucket_time.isoformat())
        rmse_list.append(metrics["rmse"])
        mae_list.append(metrics["mae"])
        r_squared_list.append(metrics["r_squared"])
        n_samples_list.append(metrics["n_samples"])
    
    return {
        "time_buckets": time_buckets,
        "rmse": rmse_list,
        "mae": mae_list,
        "r_squared": r_squared_list,
        "n_samples": n_samples_list
    }


