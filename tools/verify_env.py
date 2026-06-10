#!/usr/bin/env python3
"""
Verify .env file integrity and required variables.
Phase 2: Link - Environment Variable Validation
"""

import os
from pathlib import Path

def verify_env():
    """Verify all required environment variables exist and are non-empty."""
    
    env_path = Path(__file__).parent.parent / ".env"
    
    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        return False
    
    required_vars = ["GROQ_KEY", "JIRA_EMAIL", "JIRA_TOKEN", "JIRA_URL"]
    
    # Load .env file
    env_vars = {}
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    except Exception as e:
        print(f"❌ Error parsing .env: {e}")
        return False
    
    all_valid = True
    for var in required_vars:
        if var not in env_vars:
            print(f"❌ Missing required variable: {var}")
            all_valid = False
        elif not env_vars[var]:
            print(f"❌ Empty value for: {var}")
            all_valid = False
        else:
            # Mask sensitive values
            masked = env_vars[var][:4] + "***" if len(env_vars[var]) > 4 else "***"
            print(f"✅ {var} = {masked}")
    
    return all_valid

if __name__ == "__main__":
    print("=== Phase 2: Link - Environment Verification ===\n")
    
    if verify_env():
        print("\n✅ All environment variables are valid!")
    else:
        print("\n❌ Environment validation failed. Please check your .env file.")
