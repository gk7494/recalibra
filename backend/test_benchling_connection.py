#!/usr/bin/env python3
"""
Test script to verify Benchling API connection works end-to-end.

Usage:
    python test_benchling_connection.py

Make sure to set BENCHLING_API_URL and BENCHLING_API_KEY environment variables first.
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
        print("  export BENCHLING_API_URL='https://your-tenant.benchling.com'")
        print("  export BENCHLING_API_KEY='sk_...'")
        print("\nOr create a .env file in the backend directory:")
        print("  BENCHLING_API_URL=https://your-tenant.benchling.com")
        print("  BENCHLING_API_KEY=sk_...")
        return False
    
    print(f"\n✅ Found credentials:")
    print(f"   API URL: {api_url}")
    print(f"   API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '***'}")
    
    # Try to fetch assay results
    try:
        from app.services.benchling_client import fetch_assay_results
        
        print("\n🔄 Fetching assay results from Benchling...")
        results = fetch_assay_results(limit=5)
        
        print(f"\n✅ SUCCESS! Fetched {len(results)} assay results")
        print("\nSample results:")
        for i, result in enumerate(results[:3], 1):
            print(f"\n  Result {i}:")
            print(f"    ID: {result.get('id', 'N/A')}")
            print(f"    Molecule ID: {result.get('molecule_id', 'N/A')}")
            print(f"    Y True: {result.get('y_true', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        print("\nTroubleshooting:")
        print("  1. Check that BENCHLING_API_URL is correct (should be your tenant domain)")
        print("  2. Verify BENCHLING_API_KEY is valid and not expired")
        print("  3. Ensure you have Developer Platform access")
        print("  4. Check network connectivity")
        return False


if __name__ == "__main__":
    success = test_benchling_connection()
    sys.exit(0 if success else 1)




