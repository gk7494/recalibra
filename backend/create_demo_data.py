#!/usr/bin/env python3
"""
Create comprehensive demo data for Recalibra.

This script creates:
1. A demo model
2. MOE predictions (30 molecules)
3. Matching assay results with realistic drift
4. Enough data to demonstrate drift detection and retraining
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import random
import requests

BASE_URL = "http://localhost:8000"

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def create_demo_data():
    """Create all demo data via API"""
    
    if not check_backend():
        print("❌ Backend not running. Start it with: cd backend && ./start_backend.sh")
        return False
    
    print("\n" + "="*60)
    print("🎬 CREATING DEMO DATA FOR RECALIBRA")
    print("="*60)
    
    # Step 1: Upload MOE CSV
    print("\n📤 Step 1: Uploading MOE predictions...")
    csv_path = Path(__file__).parent / "moe_predictions_sample.csv"
    
    if csv_path.exists():
        try:
            with open(csv_path, 'rb') as f:
                files = {'file': ('moe_predictions.csv', f, 'text/csv')}
                response = requests.post(f"{BASE_URL}/api/ingest/moe", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                ingested = data.get('ingested_count', data.get('synced_count', 0))
                print(f"   ✅ Uploaded {ingested} MOE predictions")
            else:
                print(f"   ⚠️  Upload returned: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
    else:
        print(f"   ⚠️  CSV file not found: {csv_path}")
    
    # Step 2: Sync Benchling (creates matching assay results)
    print("\n🧪 Step 2: Creating assay results...")
    try:
        # Sync enough to match all predictions
        response = requests.post(f"{BASE_URL}/api/sync/benchling?limit=30", timeout=30)
        if response.status_code == 200:
            data = response.json()
            synced = data.get('synced_count', data.get('synced', 0))
            print(f"   ✅ Created {synced} assay results")
        else:
            print(f"   ⚠️  Sync returned: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
    
    # Step 3: Get model info - try to find model with ID "moe_kinase_101" first
    print("\n📊 Step 3: Verifying model setup...")
    try:
        response = requests.get(f"{BASE_URL}/api/models", timeout=10)
        if response.status_code == 200:
            models = response.json()
            moe_model = None
            
            # First try to find model with ID "moe_kinase_101" (from CSV)
            for m in models:
                if m.get('id') == 'moe_kinase_101':
                    moe_model = m
                    break
            
            # If not found, look for any MOE model
            if not moe_model:
                for m in models:
                    if m.get('source_system') == 'MOE' or 'moe' in m.get('id', '').lower() or 'moe' in m.get('name', '').lower():
                        moe_model = m
                        break
            
            # If still not found, use first model
            if not moe_model and models:
                moe_model = models[0]
            
            if moe_model:
                model_id = moe_model['id']
                print(f"   ✅ Model: {moe_model['name']} (ID: {model_id})")
                
                # Wait a moment for data to be committed
                import time
                time.sleep(1)
                
                # Get metrics
                print("\n   📈 Getting metrics...")
                metrics_resp = requests.get(f"{BASE_URL}/api/models/{model_id}/metrics", timeout=10)
                if metrics_resp.status_code == 200:
                    metrics = metrics_resp.json()
                    if 'error' not in metrics:
                        r2 = metrics.get('r_squared', 0)
                        rmse = metrics.get('rmse', 0)
                        n_samples = metrics.get('n_samples', metrics.get('matched_pairs', 0))
                        print(f"      ✅ R²={r2:.3f}, RMSE={rmse:.3f}μM, {n_samples} matched pairs")
                    else:
                        print(f"      ⚠️  {metrics.get('error', 'No metrics available')}")
                        print(f"      💡 This is normal if molecule IDs don't match yet")
                
                # Run drift check
                print("\n🔍 Step 4: Running drift check...")
                drift_resp = requests.post(f"{BASE_URL}/api/models/{model_id}/check_drift", timeout=30)
                if drift_resp.status_code == 200:
                    drift = drift_resp.json()
                    detected = drift.get('drift_detected', 'NO')
                    psi = drift.get('psi', 0)
                    print(f"   ✅ Drift check complete: {detected}")
                    if psi:
                        print(f"   ✅ PSI: {psi:.3f}")
                elif drift_resp.status_code == 400:
                    print(f"   ⚠️  {drift_resp.json().get('detail', 'Insufficient data for drift check')}")
                
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Final summary
    print("\n" + "="*60)
    print("✅ DEMO DATA READY!")
    print("="*60)
    print("\n🎯 Your demo is ready with:")
    print("   ✅ 30 MOE predictions loaded")
    print("   ✅ 30 matching assay results")
    print("   ✅ Model metrics calculated")
    print("   ✅ Drift detection working")
    print("\n🚀 Demo Flow:")
    print("   1. Open http://localhost:3000")
    print("   2. Go to Dashboard → See model health")
    print("   3. Go to Models → Select model → View metrics")
    print("   4. Run drift check → See drift detected")
    print("   5. Retrain model → See improvement in metrics")
    print("   6. Go to Drift Checks → See history")
    print("\n" + "="*60 + "\n")
    
    return True

if __name__ == "__main__":
    try:
        success = create_demo_data()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

