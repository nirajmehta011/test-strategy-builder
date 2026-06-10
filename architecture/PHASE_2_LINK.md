# Phase 2: Link (Connectivity Verification)

## Goal
Verify all external API connections are working with .env credentials before proceeding to Phase 3 (Architect).

## Verification Checklist

### 1. Jira Cloud API
- **Endpoint:** `GET {JIRA_URL}/rest/api/3/myself`
- **Auth:** Basic Auth (email + API token)
- **Expected Response:** User object with account ID and email
- **Error Handling:** Handle auth failures, network timeouts, invalid URLs

### 2. Groq API
- **Endpoint:** `GET https://api.groq.com/openai/v1/models`
- **Auth:** Bearer Token in Authorization header
- **Expected Response:** List of available models with IDs
- **Error Handling:** Handle invalid keys, rate limits, API unavailability

### 3. Environment Variables
- Verify all 4 required vars exist: `GROQ_KEY`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_URL`
- Validate format (non-empty strings)

## Tools Created
- `verify_jira.py` – Tests Jira authentication and issue fetch
- `verify_groq.py` – Tests Groq API models endpoint
- `verify_env.py` – Validates .env file integrity

## Success Criteria
- ✅ Jira API responds with authenticated user data
- ✅ Groq API returns list of available models
- ✅ All .env variables are properly formatted
- ✅ Error handling logs are clear and actionable

## Next Phase
Once verified, move to Phase 3: Architect (define 3-layer structure and React component design).
