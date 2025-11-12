"""
Benchling API client for fetching assay results.

Supports both Benchling Python SDK and direct HTTP requests via requests library.
"""
import os
import logging
from typing import List, Dict, Optional
import json
from pathlib import Path

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    # Load .env file from backend directory
    env_path = Path(__file__).parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # python-dotenv not installed, rely on environment variables

logger = logging.getLogger(__name__)

# Try to import Benchling SDK
try:
    from benchling_sdk.benchling import Benchling
    from benchling_sdk.configuration import Configuration
    BENCHLING_SDK_AVAILABLE = True
except ImportError:
    BENCHLING_SDK_AVAILABLE = False
    logger.info("benchling-sdk not installed. Will use requests library instead.")

# Try to import requests for fallback
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests library not available. Install with: pip install requests")


def fetch_assay_results(limit: int = 5) -> List[Dict]:
    """
    Fetch assay results from Benchling API.
    
    Reads BENCHLING_API_URL and BENCHLING_API_KEY from environment variables.
    Uses Benchling Python SDK if available, otherwise falls back to requests.
    
    Args:
        limit: Maximum number of results to fetch (default: 5)
    
    Returns:
        List of assay result dictionaries
    
    Raises:
        Exception: If API request fails with specific error details
    """
    # Read environment variables
    api_url = os.getenv("BENCHLING_API_URL")
    api_key = os.getenv("BENCHLING_API_KEY")
    
    if not api_url or not api_key:
        error_msg = "BENCHLING_API_URL and BENCHLING_API_KEY must be set in environment"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    # Normalize API URL (remove trailing slash, ensure https)
    api_url = api_url.rstrip('/')
    if not api_url.startswith('http'):
        api_url = f"https://{api_url}"
    
    # If just a tenant name (e.g., "mytenant"), convert to full URL
    # Benchling API format: https://{tenant}.benchling.com or https://api.benchling.com
    if '.benchling.com' not in api_url and 'api.benchling.com' not in api_url:
        # Assume it's a tenant name, use the standard Benchling API endpoint
        api_url = "https://api.benchling.com"
    
    logger.info(f"Fetching assay results from Benchling: {api_url}")
    logger.info(f"Using API key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '***'}")
    
    # Try using Benchling SDK first
    if BENCHLING_SDK_AVAILABLE:
        try:
            return _fetch_with_sdk(api_url, api_key, limit)
        except Exception as e:
            logger.warning(f"Benchling SDK failed: {e}. Falling back to requests library.")
            if not REQUESTS_AVAILABLE:
                raise Exception(f"SDK failed and requests library not available: {e}")
    
    # Fallback to direct HTTP request
    if REQUESTS_AVAILABLE:
        return _fetch_with_requests(api_url, api_key, limit)
    else:
        raise Exception("Neither benchling-sdk nor requests library is available. Install one of them.")


def _fetch_with_sdk(api_url: str, api_key: str, limit: int) -> List[Dict]:
    """Fetch assay results using Benchling Python SDK."""
    try:
        cfg = Configuration(
            api_key=api_key,
            host=api_url,
        )
        client = Benchling(configuration=cfg)
        
        logger.info("Using Benchling Python SDK")
        results_service = client.assay_results
        page = results_service.list(limit=limit)
        
        if not hasattr(page, 'assay_results') or not page.assay_results:
            logger.warning("No assay results returned from Benchling API")
            return []
        
        # Convert SDK objects to dictionaries
        results = []
        for r in page.assay_results:
            try:
                result_dict = {
                    "id": r.id if hasattr(r, 'id') else None,
                    "benchling_id": r.id if hasattr(r, 'id') else None,
                    "molecule_id": None,
                    "y_true": None,
                    "assay_version": None,
                    "reagent_batch": None,
                    "instrument_id": None,
                    "operator": None,
                    "run_timestamp": None,
                    "metadata_json": {}
                }
                
                # Extract fields (SDK structure)
                if hasattr(r, 'fields') and r.fields:
                    fields = r.fields if isinstance(r.fields, dict) else {}
                    result_dict["molecule_id"] = fields.get("Molecule ID") or fields.get("molecule_id")
                    result_dict["y_true"] = fields.get("Measured IC50") or fields.get("IC50") or fields.get("y_true")
                    result_dict["assay_version"] = fields.get("Assay Version") or fields.get("assay_version")
                    result_dict["reagent_batch"] = fields.get("Reagent Batch") or fields.get("reagent_batch")
                    result_dict["instrument_id"] = fields.get("Instrument ID") or fields.get("instrument_id")
                    result_dict["operator"] = fields.get("Operator") or fields.get("operator")
                    result_dict["metadata_json"] = fields
                
                results.append(result_dict)
            except Exception as e:
                logger.warning(f"Error processing result: {e}, skipping")
                continue
        
        logger.info(f"✅ Successfully fetched {len(results)} assay results using SDK")
        return results
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Benchling SDK error: {error_msg}")
        raise Exception(f"Benchling SDK error: {error_msg}")


def _fetch_with_requests(api_url: str, api_key: str, limit: int) -> List[Dict]:
    """Fetch assay results using direct HTTP requests."""
    # Benchling API v2 endpoint
    # If api_url is a tenant URL (e.g., https://mytenant.benchling.com), use that
    # Otherwise use the standard API endpoint
    if '.benchling.com' in api_url and not api_url.endswith('/api/v2'):
        endpoint = f"{api_url}/api/v2/assay-results"
    else:
        # Use standard Benchling API endpoint
        endpoint = "https://api.benchling.com/v2/assay-results"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    params = {
        "limit": limit
    }
    
    logger.info(f"Using requests library to call: {endpoint}")
    
    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=10)
        
        # Log response status
        logger.info(f"Benchling API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assay_results = data.get("assayResults", [])
            logger.info(f"✅ Successfully fetched {len(assay_results)} assay results")
            return assay_results
        elif response.status_code == 401:
            error_msg = "❌ Invalid API key or missing scope"
            logger.error(error_msg)
            raise Exception(error_msg)
        elif response.status_code == 403:
            error_msg = "❌ Access forbidden. Check your API key permissions."
            logger.error(error_msg)
            raise Exception(error_msg)
        elif response.status_code == 404:
            error_msg = f"❌ Endpoint not found. Check your tenant URL: {api_url}"
            logger.error(error_msg)
            raise Exception(error_msg)
        else:
            error_msg = f"❌ Benchling API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)
            
    except requests.exceptions.ConnectionError as e:
        error_msg = f"❌ Check your tenant URL - connection failed: {api_url}"
        logger.error(error_msg)
        raise Exception(error_msg)
    except requests.exceptions.Timeout as e:
        error_msg = "❌ Request timeout. Check your network connection."
        logger.error(error_msg)
        raise Exception(error_msg)
    except requests.exceptions.RequestException as e:
        error_msg = f"❌ Request failed: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    except json.JSONDecodeError as e:
        error_msg = f"❌ Invalid JSON response from Benchling API: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
