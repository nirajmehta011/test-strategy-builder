#!/usr/bin/env python3
"""
Verify Jira Cloud API connectivity.
Phase 2: Link - Jira API Handshake
"""

import os
import sys
import requests
import base64
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

def verify_jira():
    """Test Jira Cloud API authentication and endpoint."""
    
    env = load_env()
    if not env:
        return False
    
    jira_email = env.get("JIRA_EMAIL")
    jira_token = env.get("JIRA_TOKEN")
    jira_url = env.get("JIRA_URL", "").rstrip("/")
    
    if not all([jira_email, jira_token, jira_url]):
        print("❌ Missing Jira configuration (JIRA_EMAIL, JIRA_TOKEN, JIRA_URL)")
        return False
    
    # Test endpoint: Get current user
    test_endpoint = f"{jira_url}/rest/api/3/myself"
    
    # Create Basic Auth header
    auth_string = base64.b64encode(f"{jira_email}:{jira_token}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth_string}",
        "Accept": "application/json"
    }
    
    try:
        print(f"Testing Jira API at: {test_endpoint}")
        response = requests.get(test_endpoint, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Jira authentication successful!")
            print(f"   Account ID: {data.get('accountId', 'N/A')}")
            print(f"   Email: {data.get('emailAddress', 'N/A')}")
            print(f"   Display Name: {data.get('displayName', 'N/A')}")
            return True
        elif response.status_code == 401:
            print(f"❌ Jira authentication failed (401 Unauthorized)")
            print(f"   Check JIRA_EMAIL and JIRA_TOKEN")
            return False
        else:
            print(f"❌ Jira API error ({response.status_code}): {response.text}")
            return False
    
    except requests.exceptions.Timeout:
        print("❌ Jira API request timed out. Check JIRA_URL.")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Failed to connect to Jira. Check JIRA_URL and network.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=== Phase 2: Link - Jira API Verification ===\n")
    
    if verify_jira():
        print("\n✅ Jira API connection verified!")
        sys.exit(0)
    else:
        print("\n❌ Jira API verification failed.")
        sys.exit(1)
