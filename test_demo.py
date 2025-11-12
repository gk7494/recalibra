#!/usr/bin/env python3
"""Test the complete Recalibra demo"""
import requests
import json
import time

API_URL = "http://localhost:8000/api"

def test_demo():
    print("🧪 Testing Recalibra Demo...")
    print("="*50)
    
    # 1. Check models
    print("\n1. Checking models...")
    resp = requests.get(f"{API_URL}/models")
    if resp.status_code == 200:
        models = resp.json()
        print(f"   ✅ Found {len(models)} model(s)")
        if len(models) > 0:
            model_id = models[0]["id"]
            print(f"   Using model: {models[0]['name']} (ID: {model_id})")
        else:
            print("   ⚠️  No models found")
            return
    else:
        print(f"   ❌ Error: {resp.status_code}")
        return
    
    # 2. Check predictions
    print("\n2. Checking predictions...")
    resp = requests.get(f"{API_URL}/predictions?model_id={model_id}")
    if resp.status_code == 200:
        predictions = resp.json()
        print(f"   ✅ Found {len(predictions)} prediction(s)")
    else:
        print(f"   ❌ Error: {resp.status_code}")
        return
    
    # 3. Check experimental results
    print("\n3. Checking experimental results...")
    resp = requests.get(f"{API_URL}/experimental-results")
    if resp.status_code == 200:
        results = resp.json()
        print(f"   ✅ Found {len(results)} result(s)")
    else:
        print(f"   ❌ Error: {resp.status_code}")
        return
    
    # 4. Test drift detection
    print("\n4. Testing drift detection...")
    resp = requests.post(f"{API_URL}/drift/check/{model_id}")
    if resp.status_code == 200:
        drift = resp.json()
        print(f"   ✅ Drift detection completed!")
        print(f"   Drift detected: {drift.get('drift_detected', False)}")
        print(f"   R²: {drift.get('r_squared', 0):.3f}")
        print(f"   RMSE: {drift.get('rmse', 0):.3f}")
    else:
        print(f"   ⚠️  Drift check failed: {resp.status_code} - {resp.text[:100]}")
    
    # 5. Test model metrics
    print("\n5. Testing model metrics...")
    resp = requests.get(f"{API_URL}/models/{model_id}/metrics")
    if resp.status_code == 200:
        metrics = resp.json()
        if "error" not in metrics:
            print(f"   ✅ Metrics retrieved!")
            print(f"   R²: {metrics.get('r_squared', 0):.3f}")
            print(f"   RMSE: {metrics.get('rmse', 0):.3f}")
            print(f"   MAE: {metrics.get('mae', 0):.3f}")
        else:
            print(f"   ⚠️  {metrics.get('error')}")
    else:
        print(f"   ⚠️  Metrics failed: {resp.status_code}")
    
    # 6. Test retraining
    print("\n6. Testing model retraining...")
    resp = requests.post(f"{API_URL}/models/{model_id}/retrain?model_type=ridge")
    if resp.status_code == 200:
        retrain = resp.json()
        print(f"   ✅ Retraining completed!")
        print(f"   Retrained at: {retrain.get('retrained_at', 'N/A')}")
        print(f"   New R²: {retrain.get('metrics', {}).get('r_squared', 0):.3f}")
        print(f"   New RMSE: {retrain.get('metrics', {}).get('rmse', 0):.3f}")
    elif resp.status_code == 501:
        print(f"   ⚠️  Retraining not available: {resp.json().get('detail', 'Unknown')}")
    else:
        print(f"   ⚠️  Retraining failed: {resp.status_code} - {resp.text[:100]}")
    
    # 7. Check drift history
    print("\n7. Checking drift check history...")
    resp = requests.get(f"{API_URL}/drift/checks/{model_id}")
    if resp.status_code == 200:
        checks = resp.json()
        print(f"   ✅ Found {len(checks)} drift check(s)")
    else:
        print(f"   ⚠️  Failed: {resp.status_code}")
    
    print("\n" + "="*50)
    print("✅ Demo test complete!")
    print("="*50)
    print("\n🌐 View in dashboard: http://localhost:3000")
    print("📚 API Docs: http://localhost:8000/docs")

if __name__ == "__main__":
    try:
        test_demo()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Backend not running!")
        print("Start it with: cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

