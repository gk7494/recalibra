"""Pytest configuration for backend package"""
import sys
from pathlib import Path

# Ensure the backend/app directory is on sys.path so `import app.*` works
ROOT = Path(__file__).resolve().parent
APP_PATH = ROOT / "app"
if str(APP_PATH) not in sys.path:
    sys.path.insert(0, str(APP_PATH))
