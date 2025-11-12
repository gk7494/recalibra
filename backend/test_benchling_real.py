#!/usr/bin/env python3
"""
Test script to verify Benchling API integration works with real credentials.
Run this to test your Benchling setup before using in the app.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_benchling_connection():
    """Test Benchling API connection"""
    print("=" * 70)
    print("Testing Benchling API Connection")
    print("=" * 70)
    
    # Check environment variables
    api_url = os.getenv("BENCHLING_API_URL")
    api_key = os.getenv("BENCHLING_API_KEY")
    
    if not api_url or not api_key:
        print("\n❌ Missing Benchling credentials!")
        print("\nSet environment variables:")
        print("  export BENCHLING_API_URL='https://your-tenant-api.benchling.com'")
        print("  export BENCHLING_API_KEY='sk_live_...'")
        print("\nOr create a .env file in the backend directory:")
        print("  BENCHLING_API_URL=https://your-tenant-api.benchling.com")
        print("  BENCHLING_API_KEY=sk_live_...")
        return False
    
    print(f"\n✅ Found credentials:")
    print(f"   API URL: {api_url}")
    print(f"   API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '***'}")
    
    # Try to import and use Benchling SDK
    try:
        from app.services.benchling_client import get_benchling_client, fetch_assay_results
        
        print("\n📡 Testing Benchling client creation...")
        client = get_benchling_client()
        
        if not client:
            print("❌ Failed to create Benchling client")
            return False
        
        print("✅ Benchling client created successfully")
        
        print("\n📡 Fetching assay results (limit=5)...")
        results = fetch_assay_results(limit=5)
        
        if not results:
            print("⚠️  No results returned (this may be normal if no data exists)")
            print("   The API connection worked, but no assay results were found.")
            return True
        
        print(f"✅ Successfully fetched {len(results)} assay results!")
        print("\n📊 Sample result:")
        if results:
            sample = results[0]
            print(f"   Molecule ID: {sample.get('molecule_id')}")
            print(f"   Measured Value (y_true): {sample.get('y_true')}")
            print(f"   Assay Version: {sample.get('assay_version')}")
            print(f"   Reagent Batch: {sample.get('reagent_batch')}")
            print(f"   Instrument ID: {sample.get('instrument_id')}")
            print(f"   Operator: {sample.get('operator')}")
            print(f"   Timestamp: {sample.get('run_timestamp')}")
        
        return True
        
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("\nInstall Benchling SDK:")
        print("  pip install benchling-sdk")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_benchling_connection()
    sys.exit(0 if success else 1)








