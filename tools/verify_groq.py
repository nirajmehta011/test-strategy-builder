#!/usr/bin/env python3
"""
Verify Groq API connectivity and list available models.
Phase 2: Link - Groq API Handshake
"""

import os
import sys
import requests
from pathlib import Path

def load_env():
    """Load .env variables."""
    env_path = Path(__file__).parent.parent / ".env"
    env_vars = {}
    
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    except Exception as e:
        print(f"❌ Error loading .env: {e}")
        return None
    
    return env_vars

def verify_groq():
    """Test Groq API connectivity and fetch available models."""
    
    env = load_env()
    if not env:
        return False
    
    groq_key = env.get("GROQ_KEY")
    
    if not groq_key:
        print("❌ Missing GROQ_KEY in .env")
        return False
    
    # Groq API endpoint for models
    models_endpoint = "https://api.groq.com/openai/v1/models"
    
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Accept": "application/json"
    }
    
    try:
        print(f"Testing Groq API at: {models_endpoint}")
        response = requests.get(models_endpoint, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            models = data.get("data", [])
            
            if not models:
                print("⚠️  Groq API responded but no models available")
                return False
            
            print(f"✅ Groq API authentication successful!")
            print(f"   Available models ({len(models)}):")
            for model in models:
                model_id = model.get("id", "unknown")
                owned_by = model.get("owned_by", "N/A")
                print(f"     • {model_id} (owned by: {owned_by})")
            
            return True
        
        elif response.status_code == 401:
            print(f"❌ Groq authentication failed (401 Unauthorized)")
            print(f"   Check GROQ_KEY in .env")
            return False
        
        else:
            print(f"❌ Groq API error ({response.status_code}): {response.text}")
            return False
    
    except requests.exceptions.Timeout:
        print("❌ Groq API request timed out.")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Failed to connect to Groq API. Check network.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=== Phase 2: Link - Groq API Verification ===\n")
    
    if verify_groq():
        print("\n✅ Groq API connection verified!")
        sys.exit(0)
    else:
        print("\n❌ Groq API verification failed.")
        sys.exit(1)
