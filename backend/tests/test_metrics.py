"""Tests for metrics calculation"""
import pytest
import numpy as np
from app.services.metrics import calculate_metrics


def test_calculate_metrics_perfect_prediction():
    """Test metrics calculation with perfect predictions"""
    predictions = [1.0, 2.0, 3.0, 4.0, 5.0]
    actuals = [1.0, 2.0, 3.0, 4.0, 5.0]
    
    result = calculate_metrics(predictions, actuals)
    
    assert result["rmse"] == 0.0
    assert result["mae"] == 0.0
    assert result["r_squared"] == 1.0
    assert result["n_samples"] == 5


def test_calculate_metrics_with_error():
    """Test metrics calculation with prediction errors"""
    predictions = [1.0, 2.0, 3.0, 4.0, 5.0]
    actuals = [1.5, 2.5, 3.5, 4.5, 5.5]  # Constant offset of 0.5
    
    result = calculate_metrics(predictions, actuals)
    
    assert result["rmse"] == pytest.approx(0.5, abs=1e-6)
    assert result["mae"] == pytest.approx(0.5, abs=1e-6)
    assert result["r_squared"] == 1.0  # Perfect correlation, just offset
    assert result["n_samples"] == 5


def test_calculate_metrics_mismatched_length():
    """Test that mismatched lengths raise ValueError"""
    predictions = [1.0, 2.0, 3.0]
    actuals = [1.0, 2.0]
    
    with pytest.raises(ValueError, match="must have the same length"):
        calculate_metrics(predictions, actuals)


def test_calculate_metrics_empty_data():
    """Test that empty data raises ValueError"""
    predictions = []
    actuals = []
    
    with pytest.raises(ValueError, match="empty data"):
        calculate_metrics(predictions, actuals)


def test_calculate_metrics_realistic_data():
    """Test with realistic prediction/actual pairs"""
    # Simulate realistic docking scores vs IC50 values
    predictions = [10.5, 25.3, 8.2, 45.1, 12.7, 30.0, 15.3, 22.1]
    actuals = [11.2, 24.8, 8.9, 43.5, 13.1, 28.5, 16.0, 21.3]
    
    result = calculate_metrics(predictions, actuals)
    
    assert result["rmse"] > 0
    assert result["mae"] > 0
    assert result["r_squared"] > 0.5  # Should have reasonable correlation
    assert result["n_samples"] == 8


