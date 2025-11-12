"""Tests for drift detection"""
import pytest
import numpy as np
from app.services.drift import (
    kolmogorov_smirnov_test,
    population_stability_index,
    kl_divergence
)


def test_ks_test_no_drift():
    """Test KS test when distributions are similar"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(0, 1, 100).tolist()
    
    statistic, p_value = kolmogorov_smirnov_test(baseline, recent)
    
    assert 0 <= statistic <= 1
    assert 0 <= p_value <= 1
    # With similar distributions, p-value should be relatively high
    assert p_value > 0.05  # Not significant


def test_ks_test_with_drift():
    """Test KS test when distributions are different"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(5, 1, 100).tolist()  # Shifted distribution
    
    statistic, p_value = kolmogorov_smirnov_test(baseline, recent)
    
    assert 0 <= statistic <= 1
    assert 0 <= p_value <= 1
    # With different distributions, p-value should be low
    assert p_value < 0.05  # Significant difference


def test_psi_no_drift():
    """Test PSI when distributions are similar"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(0, 1, 100).tolist()
    
    psi = population_stability_index(baseline, recent)
    
    assert psi >= 0
    assert psi < 0.2  # Low PSI indicates stability


def test_psi_with_drift():
    """Test PSI when distributions are different"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(5, 1, 100).tolist()  # Shifted distribution
    
    psi = population_stability_index(baseline, recent)
    
    assert psi >= 0
    assert psi > 0.2  # High PSI indicates drift


def test_kl_divergence_no_drift():
    """Test KL divergence when distributions are similar"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(0, 1, 100).tolist()
    
    kl = kl_divergence(baseline, recent)
    
    assert kl >= 0
    assert kl < 0.5  # Low KL divergence indicates similarity


def test_kl_divergence_with_drift():
    """Test KL divergence when distributions are different"""
    baseline = np.random.normal(0, 1, 100).tolist()
    recent = np.random.normal(5, 1, 100).tolist()  # Shifted distribution
    
    kl = kl_divergence(baseline, recent)
    
    assert kl >= 0
    assert kl > 0.5  # High KL divergence indicates difference


def test_ks_test_constant_values():
    """Test KS test with constant values"""
    baseline = [1.0] * 10
    recent = [1.0] * 10
    
    statistic, p_value = kolmogorov_smirnov_test(baseline, recent)
    
    assert statistic == 0.0
    assert p_value == 1.0


def test_psi_constant_values():
    """Test PSI with constant values"""
    baseline = [1.0] * 10
    recent = [1.0] * 10
    
    psi = population_stability_index(baseline, recent)
    
    assert psi == 0.0


