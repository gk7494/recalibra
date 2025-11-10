"""Drift detection utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
from scipy import stats


@dataclass(slots=True)
class DriftResult:
    psi: float
    ks_statistic: float
    ks_pvalue: float

    def breached(self, psi_threshold: float, ks_threshold: float) -> bool:
        """Return True if any drift thresholds are exceeded."""
        return self.psi >= psi_threshold or self.ks_pvalue <= ks_threshold


def population_stability_index(
    expected: Iterable[float], actual: Iterable[float], bins: int = 10
) -> float:
    """Compute the Population Stability Index between two distributions."""
    expected_array = np.array(list(expected))
    actual_array = np.array(list(actual))
    if expected_array.size == 0 or actual_array.size == 0:
        return float("nan")

    percentiles = np.linspace(0, 100, bins + 1)
    cuts = np.percentile(expected_array, percentiles)
    cuts = np.unique(cuts)
    if cuts.size <= 1:
        return 0.0

    expected_hist, _ = np.histogram(expected_array, bins=cuts)
    actual_hist, _ = np.histogram(actual_array, bins=cuts)

    expected_dist = expected_hist / expected_hist.sum()
    actual_dist = actual_hist / actual_hist.sum()

    psi_components = []
    for exp, act in zip(expected_dist, actual_dist, strict=False):
        exp = max(exp, 1e-6)
        act = max(act, 1e-6)
        psi_components.append((act - exp) * np.log(act / exp))
    return float(np.sum(psi_components))


def detect_drift(baseline: Iterable[float], current: Iterable[float]) -> DriftResult:
    """Run PSI and KS test between baseline and current distributions."""
    baseline_array = np.array(list(baseline))
    current_array = np.array(list(current))
    if baseline_array.size == 0 or current_array.size == 0:
        return DriftResult(psi=float("nan"), ks_statistic=float("nan"), ks_pvalue=float("nan"))

    psi = population_stability_index(baseline_array, current_array)
    ks_statistic, ks_pvalue = stats.ks_2samp(baseline_array, current_array, alternative="two-sided")
    return DriftResult(psi=psi, ks_statistic=float(ks_statistic), ks_pvalue=float(ks_pvalue))


__all__ = ["DriftResult", "population_stability_index", "detect_drift"]

