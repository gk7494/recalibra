#!/usr/bin/env python3
"""
Import real model data into the database
"""
import sys
import requests
from pathlib import Path

API_URL = "http://localhost:8000"

def import_moe_csv(csv_path: str):
    """Import MOE predictions from CSV"""
    print(f"\n📤 Importing MOE predictions from {csv_path}...")
    
    with open(csv_path, 'rb') as f:
        response = requests.post(
            f"{API_URL}/api/ingest/moe",
            files={'file': f}
        )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Successfully imported {data.get('ingested_count', 0)} predictions")
        print(f"   Skipped: {data.get('skipped', 0)}")
        return True
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"   {response.text}")
        return False

def create_assay_results():
    """Create matching assay results for the predictions"""
    print("\n📤 Creating assay results...")
    
    # Create assay results that match some of the predictions
    # This simulates experimental data from Benchling
    assay_results = []
    
    # Match some predictions with experimental results
    # enzyme_52 predictions
    for i in range(1, 16):
        molecule_id = f"CMPD_{i:03d}"
        # Simulate experimental IC50 values (slightly different from predictions)
        # Predictions are docking scores (negative), convert to IC50 (positive)
        predicted_ic50 = abs(-8.0 + (i % 5) * 0.5)  # Vary around 8.0
        # Add some experimental noise
        import random
        experimental_ic50 = predicted_ic50 * (0.8 + random.random() * 0.4)
        
        assay_results.append({
            "benchling_id": f"assay_{molecule_id}",
            "molecule_id": molecule_id,
            "assay_version": "v3" if i <= 10 else "v4",
            "reagent_batch": f"RB_{92 + (i-1)//5}",
            "instrument_id": "LCMS_01" if i % 2 == 1 else "LCMS_02",
            "operator": "operator_1",
            "y_true": round(experimental_ic50, 2),
            "run_timestamp": f"2024-11-{(i-1)//5 + 1:02d}T10:00:00Z"
        })
    
    # kinase_101 predictions
    for i in range(21, 31):
        molecule_id = f"CMPD_{i:03d}"
        predicted_ic50 = abs(-8.0 + (i % 5) * 0.5)
        import random
        experimental_ic50 = predicted_ic50 * (0.8 + random.random() * 0.4)
        
        assay_results.append({
            "benchling_id": f"assay_{molecule_id}",
            "molecule_id": molecule_id,
            "assay_version": "v2",
            "reagent_batch": f"RB_{92 + (i-21)//5}",
            "instrument_id": "LCMS_01" if i % 2 == 1 else "LCMS_02",
            "operator": "operator_2",
            "y_true": round(experimental_ic50, 2),
            "run_timestamp": f"2024-11-{(i-21)//5 + 2:02d}T13:00:00Z"
        })
    
    # protease_42 predictions
    for i in range(31, 41):
        molecule_id = f"CMPD_{i:03d}"
        predicted_ic50 = abs(-8.0 + (i % 5) * 0.5)
        import random
        experimental_ic50 = predicted_ic50 * (0.8 + random.random() * 0.4)
        
        assay_results.append({
            "benchling_id": f"assay_{molecule_id}",
            "molecule_id": molecule_id,
            "assay_version": "v1",
            "reagent_batch": f"RB_{92 + (i-31)//5}",
            "instrument_id": "LCMS_01" if i % 2 == 1 else "LCMS_02",
            "operator": "operator_3",
            "y_true": round(experimental_ic50, 2),
            "run_timestamp": f"2024-11-{(i-31)//5 + 3:02d}T09:30:00Z"
        })
    
    # Import via API (we'll need to create an endpoint or use direct DB access)
    # For now, let's use a direct database approach
    print(f"   Created {len(assay_results)} assay results")
    return assay_results

def import_via_db(assay_results):
    """Import assay results directly to database"""
    import sys
    from pathlib import Path
    from datetime import datetime
    sys.path.insert(0, str(Path(__file__).parent))
    
    from app.db.session import SessionLocal
    from app.db.models import AssayResult
    
    db = SessionLocal()
    try:
        imported = 0
        for result_data in assay_results:
            # Convert timestamp string to datetime object
            if isinstance(result_data.get("run_timestamp"), str):
                timestamp_str = result_data["run_timestamp"].replace("Z", "+00:00")
                try:
                    result_data["run_timestamp"] = datetime.fromisoformat(timestamp_str)
                except ValueError:
                    result_data["run_timestamp"] = None
            
            # Check if exists
            existing = db.query(AssayResult).filter(
                AssayResult.benchling_id == result_data["benchling_id"]
            ).first()
            
            if not existing:
                db_result = AssayResult(**result_data)
                db.add(db_result)
                imported += 1
        
        db.commit()
        print(f"✅ Imported {imported} assay results to database")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error importing assay results: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Importing Real Model Data")
    print("=" * 70)
    
    # Check API is running
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code != 200:
            print(f"❌ API not healthy. Status: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Cannot connect to API at {API_URL}")
        print(f"   Error: {e}")
        print(f"   Make sure backend is running: cd backend && ./start_backend.sh")
        sys.exit(1)
    
    # Import MOE predictions
    csv_path = Path(__file__).parent / "real_models_data.csv"
    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_path}")
        sys.exit(1)
    
    success = import_moe_csv(str(csv_path))
    
    if success:
        # Create and import assay results
        assay_results = create_assay_results()
        import_via_db(assay_results)
        
        print("\n" + "=" * 70)
        print("✅ Data import complete!")
        print("=" * 70)
        print("\nYou can now:")
        print("  • View models at: http://localhost:3000/models")
        print("  • Check drift at: http://localhost:3000/drift")
        print("  • View API docs at: http://localhost:8000/docs")
    else:
        print("\n❌ Import failed")
        sys.exit(1)

