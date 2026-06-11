import axios from 'axios'
import { AIProvider } from '../context/SettingsContext'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : '/api')

export interface AIModel {
  id: string
  name: string
}

export interface TestCase {
  id: string
  summary: string
  issueType: string
  priority: string
  labels: string
  testType: string
  precondition: string
  steps: TestStep[]
  status: string
  component: string
  estimatedTime: string
  scenarioType: 'happy_path' | 'negative' | 'edge_case' | 'boundary' | 'ui_ux' | 'security' | 'performance'
}

export interface TestStep {
  stepNumber: number
  action: string
  testData: string
  expectedResult: string
}

export const GROQ_DEFAULT_MODELS: AIModel[] = [
  { id: 'llama3-70b-8192', name: 'LLaMA 3 70B (8192)' },
  { id: 'llama3-8b-8192', name: 'LLaMA 3 8B (8192)' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32768)' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
  { id: 'llama-3.1-70b-versatile', name: 'LLaMA 3.1 70B Versatile' },
  { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile' },
]

export const OPENROUTER_DEFAULT_MODELS: AIModel[] = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'LLaMA 3.1 70B Instruct' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
]

export const GEMINI_DEFAULT_MODELS: AIModel[] = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
]

export const OPENAI_DEFAULT_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]

// ─── Test Strategy Prompt ─────────────────────────────────────────────────────
const buildTestStrategyPrompt = (jiraIssue: any) => `You are a senior QA architect with 15+ years of experience. Based on the following Jira issue, generate a comprehensive test strategy using industry best practices.

Issue Key: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}
Status: ${jiraIssue.status}

Generate a detailed test strategy with EXACTLY these sections (use ## markdown headers):

## 1. Test Types
List ALL applicable test types with brief justification for each:
- Functional Testing (smoke, sanity, regression, user acceptance)
- Non-Functional Testing (performance, load, stress, security, accessibility)
- Integration Testing (API, service, data flow)
- UI/UX Testing (visual, usability, cross-browser, responsive)
Include why each type is relevant to this specific issue.

## 2. Scope
Define precisely:
- **In Scope**: What will be tested (features, user flows, integrations)
- **Out of Scope**: What will NOT be tested and why
- **Assumptions**: Dependencies and preconditions assumed

## 3. Focus Areas & Critical Paths
- Identify the top 5 highest-risk areas
- Map critical user journeys
- Highlight edge cases specific to this feature
- Call out any data integrity or security concerns

## 4. Testing Approach & Methodology
- Testing strategy (shift-left, risk-based, exploratory)
- Test design techniques (equivalence partitioning, boundary value analysis, decision tables)
- Automation vs. manual testing split recommendation
- Regression impact analysis

## 5. Risk Analysis
For each risk, provide: Risk | Likelihood | Impact | Mitigation Strategy
- Technical risks
- Business risks  
- Timeline risks
- Data/environment risks

## 6. Entry Criteria
Exact prerequisites before testing can begin:
- Code freeze/feature completion requirements
- Environment readiness checklist
- Test data requirements
- Documentation requirements

## 7. Exit Criteria
Measurable completion criteria:
- Pass rate requirements (e.g., 100% critical, 95% major)
- Defect closure requirements
- Performance benchmarks
- Sign-off requirements

## 8. Test Environments
- Environment matrix (Dev/QA/Staging/Prod)
- Browser/OS/device coverage matrix
- Test data strategy
- Third-party service mocking requirements

## 9. Deliverables & Milestones
- List all QA artifacts to be produced with owners
- Timeline estimates for each testing phase
- Review and sign-off gates

## 10. Traceability Matrix
- Map requirements to test scenarios
- Coverage metrics targets
- Defect tracking linkage

Format as professional markdown. Be specific to this Jira issue, not generic.`

// ─── RICE-POT Test Plan Prompt ────────────────────────────────────────────────
const buildTestPlanPrompt = (jiraIssue: any) => `You are a senior QA Lead creating a formal Test Plan document following the RICE-POT methodology and IEEE 829 standard. This is a professional deliverable for stakeholders.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}
Status: ${jiraIssue.status}
Created: ${jiraIssue.created}
Updated: ${jiraIssue.updated}

Generate a COMPLETE, PROFESSIONAL Test Plan document using the RICE-POT framework. Each section must be thorough and specific to this ticket.

---

# TEST PLAN: ${jiraIssue.key} – ${jiraIssue.summary}

**Document Version:** 1.0  
**Status:** Draft  
**Prepared By:** QA Team  
**Date:** ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

---

## R – REQUIREMENTS

### 1.1 Objective
State the primary objective of this test plan and what business value the testing delivers.

### 1.2 Functional Requirements to be Tested
List EVERY functional requirement derived from the Jira ticket with a unique ID (FR-001, FR-002...).

### 1.3 Non-Functional Requirements
List all non-functional requirements (performance SLAs, accessibility standards, security requirements, compatibility requirements).

### 1.4 Regulatory & Compliance Requirements
Note any compliance standards applicable (GDPR, WCAG 2.1, ISO 27001, etc.).

---

## I – INTERFACES

### 2.1 User Interfaces
Describe all UI screens, pages, and components involved. List input fields, controls, and visual elements to test.

### 2.2 API Interfaces
List all REST/GraphQL endpoints, request/response schemas, authentication mechanisms, and rate limits.

### 2.3 Data Interfaces
Database interactions, file imports/exports, third-party data feeds.

### 2.4 External System Integrations
All third-party services, webhooks, event buses, or external APIs.

---

## C – COMPONENTS & INTEGRATION

### 3.1 System Components Under Test
List each software component, microservice, or module being tested.

### 3.2 Integration Points & Dependencies
Map the component interaction diagram in text. Identify critical integration paths.

### 3.3 Integration Test Strategy
How integration between components will be validated (top-down, bottom-up, big-bang, sandwich).

### 3.4 Out-of-Scope Components
Explicitly state what is NOT being tested and justify why.

---

## E – ENVIRONMENT

### 4.1 Test Environment Specifications

| Environment | Purpose | URL/Location | Owner |
|-------------|---------|-------------|-------|
| Development | Unit/Component testing | ... | Dev Team |
| QA/Test | Functional testing | ... | QA Team |
| Staging | Pre-release validation | ... | DevOps |
| Production | Smoke testing only | ... | QA Lead |

### 4.2 Hardware Requirements
Minimum/recommended specs for test execution.

### 4.3 Browser & OS Coverage Matrix

| Browser | Version | OS | Priority |
|---------|---------|-----|---------|
List all required combinations.

### 4.4 Test Data Requirements
- Types of test data needed
- Test data creation/generation strategy
- Sensitive data masking requirements
- Data volume requirements for performance tests

### 4.5 Tools & Infrastructure
- Test management tool (Jira/Zephyr)
- Automation framework
- CI/CD pipeline integration
- Monitoring and logging tools

---

## P – PROCEDURES

### 5.1 Test Execution Approach
Describe the step-by-step test execution workflow from start to finish.

### 5.2 Test Design Techniques
- Equivalence Partitioning analysis for this feature
- Boundary Value Analysis examples
- Decision Table testing scenarios
- State Transition testing (if applicable)
- Use Case / User Story testing

### 5.3 Entry Criteria
**Testing CANNOT begin until ALL of the following are met:**
List 8-12 specific, measurable entry criteria with responsible party.

### 5.4 Exit Criteria
**Testing is COMPLETE when ALL of the following are satisfied:**
List 8-12 specific, measurable exit criteria with acceptance thresholds.

### 5.5 Suspension & Resumption Criteria
Define when testing should be suspended (blocking defects, environment failure) and how it resumes.

### 5.6 Defect Management Process
- Defect severity/priority classification table
- Defect lifecycle (Open → Assigned → In Progress → Fixed → Verified → Closed)
- SLA for defect resolution by severity
- Escalation path

---

## O – OPERATIONS

### 6.1 Team & Responsibilities

| Role | Name/Team | Responsibilities |
|------|-----------|-----------------|
List all roles involved in testing with specific responsibilities.

### 6.2 Test Schedule & Milestones

| Phase | Activity | Duration | Start | End |
|-------|---------|---------|-------|-----|
List testing phases with realistic time estimates.

### 6.3 Resource Requirements
- QA engineers needed (number, skill level)
- Infrastructure/environment costs
- Tooling licenses

### 6.4 Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|----|------|------------|--------|-----------|-------|
List 8-12 specific risks with mitigation strategies.

### 6.5 Communication Plan
- Daily standup reporting
- Defect review cadence
- Status reporting to stakeholders
- Go/No-Go decision criteria

---

## T – TRACEABILITY

### 7.1 Requirements Traceability Matrix

| Req ID | Requirement | Test Scenario ID | Test Case Count | Coverage % |
|--------|------------|-----------------|----------------|-----------|
Map every requirement (FR-001, etc.) to test scenarios.

### 7.2 Risk-Based Test Coverage
Show which risks are covered by which test scenarios.

### 7.3 Defect Traceability
How defects will be linked back to requirements and test cases.

### 7.4 Metrics & KPIs
- Test execution rate targets
- Pass/fail ratio thresholds
- Defect density acceptable levels
- Test coverage percentage goals

---

## APPENDIX

### A. Glossary
Define 10+ key terms used in this test plan.

### B. References
List standards, frameworks, and documentation referenced.

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|

---

Be exhaustive, specific, and professional. This must be a document a QA director would be proud to present to stakeholders.`

// ─── Test Cases Prompt ────────────────────────────────────────────────────────
const buildTestCasesPrompt = (jiraIssue: any) => `You are a senior QA engineer. Output ONLY a raw JSON array — no markdown, no explanation, no code fences, no text before or after the array.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}

Generate exactly 15 detailed test cases covering these scenario types:
- 4 happy_path (core workflows)
- 3 negative (invalid inputs, wrong states)
- 2 boundary (min/max/null/overflow)
- 2 edge_case (unusual valid scenarios, race conditions)
- 2 ui_ux (visual, accessibility, error messages)
- 1 security (XSS, injection, auth bypass)
- 1 performance (response time, concurrent load)

Each test case MUST follow this EXACT JSON schema. No deviations:
[
  {
    "id": "TC-001",
    "summary": "Verify [specific action] under [specific condition]",
    "issueType": "Test",
    "priority": "Critical",
    "labels": "functional,smoke",
    "testType": "Functional",
    "precondition": "User is logged in and on the [Page] page",
    "scenarioType": "happy_path",
    "component": "[Component name]",
    "estimatedTime": "10m",
    "steps": [
      {
        "stepNumber": 1,
        "action": "Navigate to [exact page/URL]",
        "testData": "N/A",
        "expectedResult": "[Exact page] loads successfully with [elements] visible"
      },
      {
        "stepNumber": 2,
        "action": "Enter [exact value] in [exact field name]",
        "testData": "[exact test value]",
        "expectedResult": "Field accepts input and shows [exact value]"
      },
      {
        "stepNumber": 3,
        "action": "Click [exact button label]",
        "testData": "N/A",
        "expectedResult": "System [performs action]. [Confirmation/result] is shown."
      }
    ],
    "status": "Not Executed"
  }
]

Rules:
- Be specific to THIS Jira issue — use field names, values, and flows from the description
- Each step must be ONE atomic action
- testData must be a concrete value or "N/A"
- expectedResult must be measurable and specific
- Output the complete JSON array only. Start your response with [ and end with ]`

class AIService {
  async fetchModels(provider: AIProvider, apiKey: string): Promise<AIModel[]> {
    try {
      const response = await axios.post(`${API_BASE}/${provider}/models`, { apiKey })
      return response.data.models || []
    } catch {
      return this.getDefaultModels(provider)
    }
  }

  getDefaultModels(provider: AIProvider): AIModel[] {
    switch (provider) {
      case 'groq': return GROQ_DEFAULT_MODELS
      case 'openrouter': return OPENROUTER_DEFAULT_MODELS
      case 'gemini': return GEMINI_DEFAULT_MODELS
      case 'openai': return OPENAI_DEFAULT_MODELS
      default: return []
    }
  }

  async testConnection(provider: AIProvider, apiKey: string): Promise<{ success: boolean; message: string; models?: AIModel[] }> {
    try {
      const response = await axios.post(`${API_BASE}/${provider}/models`, { apiKey }, { timeout: 10000 })
      const models: AIModel[] = response.data.models || []
      return {
        success: true,
        message: `✅ Connected! ${models.length > 0 ? `${models.length} models available` : 'Connection verified'}`,
        models
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Connection failed'
      if (error.message?.includes('Failed to fetch') || error.code === 'ECONNREFUSED') {
        return { success: false, message: '❌ Cannot reach backend server (port 3001). Is it running?' }
      }
      if (error.response?.status === 401) {
        return { success: false, message: `❌ Invalid API key for ${provider}` }
      }
      return { success: false, message: `❌ ${msg}` }
    }
  }

  private async callAI(provider: AIProvider, apiKey: string, model: string, prompt: string, timeoutMs = 90000): Promise<string> {
    if (!apiKey) throw new Error(`Please configure your ${provider} API key in the settings panel.`)
    if (!model) throw new Error('Please select a model in the settings panel.')

    try {
      const response = await axios.post(`${API_BASE}/${provider}/complete`, {
        apiKey,
        model,
        messages: [{ role: 'user', content: prompt }]
      }, { timeout: timeoutMs })

      return response.data.content || response.data.response?.choices?.[0]?.message?.content || ''
    } catch (error: any) {
      if (error.response?.status === 401) throw new Error(`Authentication failed for ${provider}. Check your API key.`)
      if (error.response?.status === 429) throw new Error(`Rate limited by ${provider}. Please try again in a moment.`)
      throw new Error(error.response?.data?.error || error.message || 'AI generation failed')
    }
  }

  async generateTestStrategy(provider: AIProvider, apiKey: string, model: string, jiraIssue: any): Promise<string> {
    const prompt = buildTestStrategyPrompt(jiraIssue)
    return this.callAI(provider, apiKey, model, prompt)
  }

  async generateTestPlan(provider: AIProvider, apiKey: string, model: string, jiraIssue: any): Promise<string> {
    const prompt = buildTestPlanPrompt(jiraIssue)
    return this.callAI(provider, apiKey, model, prompt, 120000)
  }

  async generateTestCases(provider: AIProvider, apiKey: string, model: string, jiraIssue: any): Promise<TestCase[]> {
    const prompt = buildTestCasesPrompt(jiraIssue)
    const raw = await this.callAI(provider, apiKey, model, prompt, 120000)

    return this.parseTestCasesJSON(raw)
  }

  private parseTestCasesJSON(raw: string): TestCase[] {
    // ── Strategy 1: Remove ALL markdown code fences (nested too) ─────────────
    let cleaned = raw
      .replace(/^```(?:json|JSON)?\s*/m, '')  // opening fence
      .replace(/\s*```\s*$/m, '')              // closing fence
      .replace(/```/g, '')                     // any remaining fences
      .trim()

    // ── Strategy 2: Extract text between first [ and last ] ───────────────────
    const firstBracket = cleaned.indexOf('[')
    const lastBracket = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1)
    }

    // ── Strategy 3: Try parsing the extracted string directly ─────────────────
    try {
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as TestCase[]
    } catch { /* continue to next strategy */ }

    // ── Strategy 4: Fix common JSON issues then parse ─────────────────────────
    const fixed = cleaned
      .replace(/,\s*([}\]])/g, '$1')           // trailing commas before } or ]
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"')      // single-quoted values
      .replace(/[\x00-\x1F\x7F]/g, ' ')         // control characters
      .trim()

    try {
      const parsed = JSON.parse(fixed)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as TestCase[]
    } catch { /* continue to next strategy */ }

    // ── Strategy 5: Extract individual objects and reassemble the array ───────
    const objectMatches = [...cleaned.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*/g)]
    if (objectMatches.length > 0) {
      const candidates: TestCase[] = []
      for (const m of objectMatches) {
        try {
          const obj = JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1'))
          if (obj && (obj.summary || obj.id)) candidates.push(obj as TestCase)
        } catch { /* skip malformed objects */ }
      }
      if (candidates.length > 0) return candidates
    }

    // ── Strategy 6: Split on TC- pattern — partial recovery ──────────────────
    const tcBlocks = cleaned.split(/(?=\{[^{]*"id"\s*:\s*"TC-\d+")/).filter(s => s.trim().startsWith('{'))
    if (tcBlocks.length > 0) {
      const recovered: TestCase[] = []
      for (const block of tcBlocks) {
        const chunk = block.replace(/,?\s*$/, '').replace(/,$/, '').trim()
        const chunkFixed = chunk.endsWith('}') ? chunk : chunk + '}'
        try {
          const obj = JSON.parse(chunkFixed.replace(/,\s*([}\]])/g, '$1'))
          if (obj?.summary) recovered.push(obj as TestCase)
        } catch { /* skip */ }
      }
      if (recovered.length > 0) return recovered
    }

    // ── All strategies exhausted ──────────────────────────────────────────────
    throw new Error(
      'The AI response could not be parsed as test cases. This usually happens with smaller models or when the response was truncated. ' +
      'Try: (1) a larger model like GPT-4o, Claude 3.5 Sonnet, or Gemini 1.5 Pro, (2) a simpler Jira ticket, or (3) retry the same ticket.'
    )
  }
}

export default new AIService()
