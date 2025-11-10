"""Recalibra core package."""

from importlib.metadata import version, PackageNotFoundError


def get_version() -> str:
    """Return installed package version, falling back to dev label."""
    try:
        return version("recalibra")
    except PackageNotFoundError:  # pragma: no cover - during local dev
        return "0.1.0-dev"


__all__ = ["get_version"]

