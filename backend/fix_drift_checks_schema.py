#!/usr/bin/env python3
"""Fix drift_checks table schema by adding missing columns"""
import sqlite3
import os
from pathlib import Path

# Find the database file
db_path = Path(__file__).parent / "recalibra.db"
if not db_path.exists():
    # Try alternative locations
    db_path = Path(__file__).parent.parent / "recalibra.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        exit(1)

print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Check current schema
cursor.execute("PRAGMA table_info(drift_checks)")
columns = {row[1]: row[2] for row in cursor.fetchall()}
print(f"Current columns: {list(columns.keys())}")

# Add missing columns if they don't exist
if 'ks_stat' not in columns:
    print("Adding ks_stat column...")
    cursor.execute("ALTER TABLE drift_checks ADD COLUMN ks_stat REAL")
    print("✓ Added ks_stat")

if 'ks_p' not in columns:
    print("Adding ks_p column...")
    cursor.execute("ALTER TABLE drift_checks ADD COLUMN ks_p REAL")
    print("✓ Added ks_p")

if 'psi' not in columns:
    print("Adding psi column...")
    cursor.execute("ALTER TABLE drift_checks ADD COLUMN psi REAL")
    print("✓ Added psi")

if 'enough_data' not in columns:
    print("Adding enough_data column...")
    cursor.execute("ALTER TABLE drift_checks ADD COLUMN enough_data TEXT DEFAULT 'YES'")
    print("✓ Added enough_data")

# Verify
cursor.execute("PRAGMA table_info(drift_checks)")
columns_after = {row[1]: row[2] for row in cursor.fetchall()}
print(f"\nUpdated columns: {list(columns_after.keys())}")

conn.commit()
conn.close()

print("\n✅ Database schema updated successfully!")




