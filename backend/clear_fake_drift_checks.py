#!/usr/bin/env python3
"""
Clear old drift checks that were created with fake/aggressive logic.
Run this to reset drift checks and start fresh with realistic detection.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database import SessionLocal
from models import DriftCheck

def clear_old_checks():
    """Delete all existing drift checks so new ones use realistic logic"""
    db = SessionLocal()
    try:
        count = db.query(DriftCheck).count()
        db.query(DriftCheck).delete()
        db.commit()
        print(f"✅ Deleted {count} old drift checks")
        print("   New drift checks will use realistic detection logic")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_old_checks()
