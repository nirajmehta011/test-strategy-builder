# Phase 3: Architect - 3-Layer Architecture Design

## Overview
The system is built using a 3-layer architecture that separates concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Navigation (React SPA)                        │
│  - Pages: Settings, TestStrategyGenerator               │
│  - State Management: Context API or Zustand             │
│  - Routing: React Router                                │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Tools (API Services & Utilities)              │
│  - jiraService.ts: Jira API client                      │
│  - groqService.ts: Groq API client                      │
│  - strategyGenerator.ts: Test strategy synthesis        │
│  - storageService.ts: LocalStorage management           │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Architecture (Deterministic Logic in .md)     │
│  - API workflows, error handling, data transformations  │
│  - Define "what" should happen, Tools define "how"      │
└─────────────────────────────────────────────────────────┘
```

## Layer 1: Architecture (Deterministic SOPs)

### 1.1 Settings Management SOP
**Goal:** Store and retrieve Jira and Groq credentials securely.

**Input:**
```json
{
  "jira_email": "string",
  "jira_token": "string",
  "jira_baseUrl": "string",
  "groq_apiKey": "string",
  "groq_selectedModel": "string"
}
```

**Process:**
1. Validate all fields are non-empty strings
2. Sanitize inputs (remove leading/trailing whitespace)
3. Store in LocalStorage under key "blast_settings"
4. Return success/error status

**Output:**
```json
{
  "success": "boolean",
  "message": "string",
  "stored_settings": "object (without sensitive data)"
}
```

**Error Handling:**
- Empty fields → Return error "All fields are required"
- Invalid Jira URL format → Return error "Invalid Jira URL"
- Duplicate save → Return warning "Settings already saved"

---

### 1.2 Jira Issue Fetch SOP
**Goal:** Retrieve Jira issue details by ID.

**Input:**
```json
{
  "jira_id": "string (e.g., 'SCRUM-6')",
  "jira_email": "string",
  "jira_token": "string",
  "jira_baseUrl": "string"
}
```

**Process:**
1. Validate Jira ID format (must contain hyphen)
2. Construct API endpoint: `{jira_baseUrl}/rest/api/3/issues/{jira_id}`
3. Create Basic Auth header (email:token base64)
4. Make HTTP GET request
5. Parse response and extract relevant fields:
   - key, summary, description, priority, status, assignee, created, updated
6. Sanitize description to remove PII (emails, phone numbers)

**Output:**
```json
{
  "key": "string",
  "summary": "string",
  "description": "string",
  "priority": "string",
  "status": "string",
  "created": "string (ISO date)",
  "updated": "string (ISO date)"
}
```

**Error Handling:**
- Invalid Jira ID → Return error "Invalid Jira ID format"
- 401 Unauthorized → Return error "Jira authentication failed"
- 404 Not Found → Return error "Jira issue not found"
- Network timeout → Return error "Request timed out"

---

### 1.3 Test Strategy Generation SOP
**Goal:** Synthesize a comprehensive test strategy using Groq API based on Jira issue details.

**Input:**
```json
{
  "jira_issue": "object (from Jira Fetch SOP)",
  "groq_apiKey": "string",
  "groq_selectedModel": "string"
}
```

**Process:**
1. Construct prompt template with Jira issue data:
   ```
   "You are a QA strategist. Based on the following issue, generate a comprehensive test strategy:
   
   Issue: {summary}
   Description: {description}
   Priority: {priority}
   Status: {status}
   
   Generate a test strategy with the following sections (in markdown format):
   - Test Types (unit, integration, e2e, performance, security)
   - Scope (what will/won't be tested)
   - Focus Areas (critical paths, edge cases)
   - Approach (testing methodology)
   - Risks (identified risks and mitigations)
   - Entry Criteria (prerequisites for testing)
   - Exit Criteria (completion criteria)
   - Environments (dev, staging, prod considerations)
   - Deliverables (artifacts to produce)
   - Traceability (how test cases map to requirements)
   
   Format as markdown with clear headers."
   ```

2. Call Groq API with model parameter
3. Parse response as markdown
4. Validate response contains all required sections
5. Return formatted markdown

**Output:**
```markdown
# Test Strategy for {JIRA_ID}

## Test Types
...

## Scope
...

(all sections as markdown)
```

**Error Handling:**
- 401 Groq auth failed → Return error "Groq authentication failed"
- Missing required sections → Return error with missing sections
- Response too short → Return error "API response incomplete"
- Network timeout → Retry up to 3 times

---

### 1.4 File Export SOP
**Goal:** Export test strategy in markdown or JSON format.

**Input:**
```json
{
  "strategy_content": "string (markdown)",
  "jira_id": "string",
  "format": "string ('markdown' or 'json')"
}
```

**Process:**
1. If format is "markdown":
   - Return content as-is
2. If format is "json":
   - Parse markdown into structured JSON with sections as keys
   - Preserve markdown formatting within section values

**Output:**
```json
{
  "jira_id": "string",
  "generated_at": "ISO timestamp",
  "format": "string",
  "content": "string or object"
}
```

**Error Handling:**
- Invalid format → Return error "Format must be 'markdown' or 'json'"
- Empty content → Return error "No content to export"

---

## Layer 2: Navigation (React Components)

### Component Structure
```
App.tsx (Root)
├── SettingsPage.tsx
│   ├── JiraSettings.tsx
│   ├── GroqSettings.tsx
│   └── PreferencesSettings.tsx (Dark/Light mode)
├── TestStrategyPage.tsx
│   ├── JiraIDInput.tsx
│   ├── StrategyDisplay.tsx
│   └── ExportButtons.tsx
├── Header.tsx (Navigation + Theme Toggle)
└── ErrorBoundary.tsx
```

### State Management (Context API)
```typescript
// Context structure
{
  settings: {
    jira: { email, token, baseUrl },
    groq: { apiKey, selectedModel },
    preferences: { darkMode, autoSave }
  },
  currentStrategy: {
    jiraId: string,
    content: markdown,
    loading: boolean,
    error: string | null
  }
}
```

---

## Layer 3: Tools (Services & Utilities)

### Service Modules
1. **jiraService.ts** → Jira API client (fetch issues)
2. **groqService.ts** → Groq API client (list models, generate strategy)
3. **strategyGenerator.ts** → Orchestrates Jira + Groq to create full strategy
4. **storageService.ts** → LocalStorage wrapper for settings
5. **exportService.ts** → Export strategy to file or clipboard

---

## Data Flow

### Generate Test Strategy Flow
```
User Input (Jira ID)
    ↓
JiraIDInput component
    ↓
Get settings from Context
    ↓
Call jiraService.fetchIssue()
    ↓
Jira API → Issue details
    ↓
Call groqService.generateStrategy()
    ↓
Groq API → Test strategy (markdown)
    ↓
Update Context with strategy
    ↓
StrategyDisplay component renders markdown
    ↓
User clicks export button
    ↓
exportService.exportMarkdown() or exportService.exportJSON()
    ↓
Download file
```

---

## Next Steps (Phase 4)
- Implement React components with TailwindCSS
- Build settings form with validation
- Implement Jira/Groq service calls
- Add error handling and loading states
- Create responsive Light/Dark mode styling
