#!/usr/bin/env python3
"""
Test script for Benchling and MOE integration.

Run this after setting up environment variables to verify the integrations work.
"""
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

def test_benchling():
    """Test Benchling client connection and data fetching"""
    print("=" * 70)
    print("Testing Benchling Integration")
    print("=" * 70)
    
    # Check environment variables
    api_url = os.getenv("BENCHLING_API_URL")
    api_key = os.getenv("BENCHLING_API_KEY")
    
    if not api_url or not api_key:
        print("❌ BENCHLING_API_URL or BENCHLING_API_KEY not set")
        print("   Set them in .env file or environment")
        return False
    
    print(f"✅ API URL: {api_url}")
    print(f"✅ API Key: {api_key[:10]}...")
    
    try:
        from app.services.benchling_client import fetch_assay_results
        
        print("\n📡 Fetching assay results from Benchling...")
        results = fetch_assay_results(limit=10)
        
        if not results:
            print("❌ No results returned")
            return False
        
        print(f"✅ Fetched {len(results)} results")
        print("\n📊 Sample result:")
        if results:
            sample = results[0]
            print(f"   molecule_id: {sample.get('molecule_id')}")
            print(f"   y_true: {sample.get('y_true')}")
            print(f"   assay_version: {sample.get('assay_version')}")
            print(f"   Fields available: {list(sample.keys())}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_moe_csv():
    """Test MOE CSV ingestion"""
    print("\n" + "=" * 70)
    print("Testing MOE CSV Ingestion")
    print("=" * 70)
    
    # Create a sample CSV for testing
    sample_csv = Path("test_moe_sample.csv")
    
    print("\n📝 Creating sample CSV...")
    sample_data = """molecule_id,model_id,docking_score,reagent_batch,assay_version,instrument_id,run_timestamp
CMPD_001,enzyme_52,-8.73,RB_92,v3,LCMS_01,2025-11-10T16:20:00Z
CMPD_002,enzyme_52,-7.45,RB_92,v3,LCMS_01,2025-11-10T16:20:00Z
CMPD_003,enzyme_52,-9.12,RB_92,v3,LCMS_01,2025-11-10T16:20:00Z"""
    
    sample_csv.write_text(sample_data)
    print(f"✅ Created {sample_csv}")
    
    try:
        from app.services.moe_ingest import load_moe_predictions_from_csv
        
        print("\n📡 Loading predictions from CSV...")
        predictions = load_moe_predictions_from_csv(str(sample_csv))
        
        if not predictions:
            print("❌ No predictions loaded")
            return False
        
        print(f"✅ Loaded {len(predictions)} predictions")
        print("\n📊 Sample prediction:")
        if predictions:
            sample = predictions[0]
            print(f"   molecule_id: {sample.get('molecule_id')}")
            print(f"   model_id: {sample.get('model_id')}")
            print(f"   y_pred: {sample.get('y_pred')}")
            print(f"   Fields available: {list(sample.keys())}")
        
        # Test invalid CSV
        print("\n🧪 Testing invalid CSV (missing docking_score)...")
        invalid_csv = Path("test_moe_invalid.csv")
        invalid_data = """molecule_id,model_id,reagent_batch
CMPD_001,enzyme_52,RB_92"""
        invalid_csv.write_text(invalid_data)
        
        try:
            load_moe_predictions_from_csv(str(invalid_csv))
            print("❌ Should have raised ValueError for missing column")
            return False
        except ValueError as e:
            print(f"✅ Correctly raised ValueError: {e}")
        
        # Cleanup
        invalid_csv.unlink()
        sample_csv.unlink()
        
        return True
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        # Cleanup on error
        if sample_csv.exists():
            sample_csv.unlink()
        return False


if __name__ == "__main__":
    print("\n🧪 Testing Recalibra Integrations\n")
    
    benchling_ok = test_benchling()
    moe_ok = test_moe_csv()
    
    print("\n" + "=" * 70)
    print("Test Results")
    print("=" * 70)
    print(f"Benchling: {'✅ PASS' if benchling_ok else '❌ FAIL'}")
    print(f"MOE CSV:   {'✅ PASS' if moe_ok else '❌ FAIL'}")
    print("=" * 70)
