#!/usr/bin/env python3
"""
Test script to verify all Recalibra API features are working
"""
import requests
import json
import time
from typing import Dict, Any

API_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("1. Testing Health Endpoint...")
    response = requests.get(f"{API_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("   ✅ Health check passed\n")
    return True

def test_models():
    """Test models endpoint"""
    print("2. Testing Models Endpoint...")
    response = requests.get(f"{API_URL}/api/models")
    assert response.status_code == 200
    models = response.json()
    print(f"   ✅ Found {len(models)} models")
    for model in models[:3]:
        print(f"      - {model['name']} ({model['source_system']})")
    print()
    return models

def test_drift_check(model_id: str):
    """Test drift detection"""
    print(f"3. Testing Drift Detection for model {model_id[:8]}...")
    response = requests.post(f"{API_URL}/api/drift/check/{model_id}")
    assert response.status_code == 200
    result = response.json()
    print(f"   ✅ Drift check completed")
    print(f"      Drift detected: {result.get('drift_detected', False)}")
    print(f"      R² Score: {result.get('r_squared', 0):.3f}")
    print(f"      RMSE: {result.get('rmse', 0):.3f}")
    print(f"      PSI: {result.get('psi_value', 0):.3f}")
    print()
    return result

def test_model_metrics(model_id: str):
    """Test model metrics"""
    print(f"4. Testing Model Metrics for model {model_id[:8]}...")
    response = requests.get(f"{API_URL}/api/models/{model_id}/metrics")
    assert response.status_code == 200
    metrics = response.json()
    print(f"   ✅ Metrics retrieved")
    print(f"      R² Score: {metrics.get('r_squared', 0):.3f}")
    print(f"      RMSE: {metrics.get('rmse', 0):.3f} μM")
    print(f"      MAE: {metrics.get('mae', 0):.3f} μM")
    print(f"      Matched pairs: {metrics.get('matched_pairs', 0)}")
    print()
    return metrics

def test_model_retraining(model_id: str):
    """Test model retraining"""
    print(f"5. Testing Model Retraining for model {model_id[:8]}...")
    response = requests.post(f"{API_URL}/api/models/{model_id}/retrain?model_type=ridge")
    assert response.status_code == 200
    result = response.json()
    print(f"   ✅ Model retrained")
    print(f"      New R² Score: {result['metrics']['r_squared']:.3f}")
    print(f"      New RMSE: {result['metrics']['rmse']:.3f} μM")
    print(f"      Improvement: {result['metrics']['r_squared'] - 0.5:.3f} (example)")
    print()
    return result

def test_sync_benchling():
    """Test Benchling sync"""
    print("6. Testing Benchling Sync...")
    response = requests.post(f"{API_URL}/api/sync/benchling")
    assert response.status_code == 200
    result = response.json()
    print(f"   ✅ Benchling sync completed")
    print(f"      Records synced: {result.get('synced_count', 0)}")
    print()
    return result

def test_sync_moe():
    """Test MOE sync"""
    print("7. Testing MOE Sync...")
    response = requests.post(f"{API_URL}/api/sync/moe")
    assert response.status_code == 200
    result = response.json()
    print(f"   ✅ MOE sync completed")
    print(f"      Records synced: {result.get('synced_count', 0)}")
    print()
    return result

def test_drift_checks_history(model_id: str):
    """Test drift checks history"""
    print(f"8. Testing Drift Checks History for model {model_id[:8]}...")
    response = requests.get(f"{API_URL}/api/drift/checks/{model_id}")
    assert response.status_code == 200
    checks = response.json()
    print(f"   ✅ Found {len(checks)} drift checks")
    if checks:
        latest = checks[0]
        print(f"      Latest check: Drift={latest.get('drift_detected', False)}, R²={latest.get('r_squared', 0):.3f}")
    print()
    return checks

def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     🧪 RECALIBRA API FUNCTIONALITY TEST                  ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    
    try:
        # Test 1: Health
        test_health()
        
        # Test 2: Get models
        models = test_models()
        if not models:
            print("❌ No models found. Run create_demo_data.py first.")
            return
        
        model_id = models[0]['id']
        
        # Test 3: Model metrics
        test_model_metrics(model_id)
        
        # Test 4: Drift check
        drift_result = test_drift_check(model_id)
        
        # Test 5: Drift checks history
        test_drift_checks_history(model_id)
        
        # Test 6: Model retraining
        retrain_result = test_model_retraining(model_id)
        
        # Test 7: Sync Benchling
        test_sync_benchling()
        
        # Test 8: Sync MOE
        test_sync_moe()
        
        print("╔══════════════════════════════════════════════════════════╗")
        print("║     ✅ ALL TESTS PASSED - API IS WORKING!               ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print()
        print("Summary:")
        print(f"  • {len(models)} models available")
        print(f"  • Drift detection: Working (R²={drift_result.get('r_squared', 0):.3f})")
        print(f"  • Model retraining: Working (New R²={retrain_result['metrics']['r_squared']:.3f})")
        print(f"  • Data syncing: Working (Benchling & MOE)")
        print()
        print("🌐 Dashboard: http://localhost:3000")
        print("📚 API Docs: http://localhost:8000/docs")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to API. Is it running?")
        print("   Start with: ./docker-start.sh or ./START.sh")
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()








