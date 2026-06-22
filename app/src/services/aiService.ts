import axios from 'axios'
import { AIProvider } from '../context/SettingsContext'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : '/api')

export interface AIModel {
  id: string
  name: string
}

export interface MediaFileData {
  mimeType: string
  base64: string
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

export interface PlaywrightAutomationFile {
  filename: string
  code: string
}

export interface PlaywrightAutomationData {
  readme: string
  packageJson: string
  tsconfigJson: string
  playwrightConfig: string
  testFiles: PlaywrightAutomationFile[]
}

export interface MoreTestCasesResponse {
  testCases: TestCase[]
  noMoreCases: boolean
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
const buildTestPlanPrompt = (jiraIssue: any, testStrategy?: string) => `You are a senior QA Lead creating a formal Test Plan document following the RICE-POT methodology and IEEE 829 standard. This is a professional deliverable for stakeholders.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}
Status: ${jiraIssue.status}
Created: ${jiraIssue.created}
Updated: ${jiraIssue.updated}
${testStrategy ? `\n\n### STRATEGIC ALIGNMENT:\nUse the following Test Strategy as input context to align your Test Plan:\n${testStrategy}\n` : ''}

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

const buildTestCasesPrompt = (jiraIssue: any, testPlan?: string) => `You are a Senior QA Architect and Test Design Expert with deep expertise in functional testing, UI validation, usability testing, exploratory testing, and requirement analysis.

Your responsibility is to analyze the provided source material (Jira details, requirement documents, user stories, acceptance criteria, or visual attachments/videos if uploaded) and generate an extremely detailed and comprehensive test suite.

Your objective is maximum coverage, not minimum test cases.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}
${testPlan ? `\n\n### TEST PLAN CONTEXT:\nUse the following Test Plan to derive and align all your test cases:\n${testPlan}\n` : ''}

### GRANULARITY RULE & TEST CASE GENERATION PRINCIPLES:
- Generate highly detailed test cases. Never skip minor actions.
- Never combine multiple validations into one step. Every click, field, message, state change, and UI element must be validated separately.
- Each step must be ONE atomic, minor action with expected results. Do not write generic or high-level steps.
- Minimum 10-40 steps per testcase when applicable. One validation per step.
- Create positive, negative, boundary, and edge scenarios.
- Generate missing scenarios using QA best practices.
- Maximize coverage rather than minimizing testcase count.
- Include UI validations, data validations, backend validations, and usability validations.

### COVERAGE REQUIREMENTS:
1. Functional Testing: Positive & negative scenarios, CRUD, Search, Filter, Sort, Pagination, Navigation, Import/Export, Session timeout, Logout.
2. UI Validation: Validate labels, text, font, alignment, buttons (visibility, color, hover, focus, state), text fields (placeholders, limits, cursor), dropdowns, checkboxes, tables, modals, tooltips.
3. Video Analysis (if video was uploaded): Perform frame-by-frame analysis. Identify pages, tabs, buttons, fields, menus, dialogs, popups, state changes, loading indicators, transitions. Convert every observed user action into detailed test steps and generate additional scenarios.
4. Negative & Boundary Value Analysis (BVA): Empty fields, invalid inputs, boundary values, special chars, SQL injection, XSS payloads, invalid file formats, concurrent actions.
5. Cross-Browser & Responsiveness: Chrome, Firefox, Safari, Edge, Mobile, Tablet, Desktop layouts.
6. Accessibility (WCAG): Tab navigation, focus order, keyboard support, screen readers, color contrast, ARIA labels.
7. Performance: Page load times, spinner visibility, API response, memory usage.
8. Security & API: Authentication, authorization, session management, URL manipulation, request/response schema validations.

### Output Format:
Output ONLY a raw JSON array. Do not wrap the JSON in markdown code blocks or any other formatting. No explanations, no text before or after the array.
Each test case in the JSON array MUST follow this EXACT JSON schema:
[
  {
    "id": "TC-001",
    "summary": "Verify [specific action] under [specific condition]",
    "issueType": "Test",
    "priority": "Critical", // Critical, Major, or Minor (corresponds to Severity)
    "labels": "functional,smoke",
    "testType": "Functional", // Functional, UI, Security, Boundary, Negative, etc.
    "precondition": "User is logged in and on the [Page] page. [Note any 'Assumptions Made' here if details are missing]",
    "scenarioType": "happy_path", // happy_path, negative, boundary, edge_case, ui_ux, security, performance
    "component": "[Component name / Module / Feature]",
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
      }
    ],
    "status": "Not Executed"
  }
]

Rules:
- Be specific to this project — use field names, values, and flows from the description/plan.
- Each step must be ONE atomic, minor action with expected results. Do not write generic or high-level steps; mention each minor action.
- testData must be a concrete value or "N/A"
- expectedResult must be measurable and specific
- Output the complete JSON array only. Start your response with [ and end with ]`

// ─── Add More Test Cases Prompt ────────────────────────────────────────────────
const buildMoreTestCasesPrompt = (jiraIssue: any, existingCases: TestCase[], startIdIndex: number) => {
  const existingSummaryList = existingCases.map(tc => `${tc.id}: ${tc.summary}`).join('\n')
  const nextIdStr = `TC-${String(startIdIndex).padStart(3, '0')}`

  return `You are a senior QA engineer. Output ONLY a raw JSON array or a specific JSON object — no markdown, no explanation, no code fences, no text before or after.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}

Here are the ${existingCases.length} test cases already generated for this ticket:
${existingSummaryList}

Task:
Analyze the Jira ticket description. Are there any other scenarios, edge cases, negative flows, boundary values, security, or performance scenarios that are not already covered?
- If all possible scenarios are already fully covered by the list above and no further tests make sense, output EXACTLY the following JSON object:
{"noMoreCases": true}
- Otherwise, generate an additional 5 to 10 new, detailed, high-quality test cases that do NOT duplicate the existing ones. Do not generate only 1-2 cases.

Start the new test case IDs from ${nextIdStr} (e.g. if the next ID should be ${nextIdStr}, write "${nextIdStr}").

Each new test case MUST follow this EXACT JSON schema:
[
  {
    "id": "${nextIdStr}",
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
      }
    ],
    "status": "Not Executed"
  }
]

Rules:
- Make sure to start the ID indexing precisely from ${nextIdStr} and increment sequentially (e.g. ${nextIdStr}, TC-${String(startIdIndex + 1).padStart(3, '0')}, etc.).
- Be specific to THIS Jira issue.
- Each step must be ONE atomic, minor action with expected results. Do not write generic or high-level steps; mention each minor action.
- testData must be a concrete value or "N/A"
- expectedResult must be measurable and specific
- Output the complete JSON array or the noMoreCases JSON object only. Start your response with [ or { and end with ] or }`
}

// ─── Custom Scenario Test Case Prompt ──────────────────────────────────────────
const buildCustomTestCasePrompt = (jiraIssue: any, existingCases: TestCase[], startIdIndex: number, customScenario: string) => {
  const existingSummaryList = existingCases.map(tc => `${tc.id}: ${tc.summary}`).join('\n')
  const nextIdStr = `TC-${String(startIdIndex).padStart(3, '0')}`

  return `You are a senior QA engineer. Output ONLY a raw JSON array containing exactly one test case — no markdown, no explanation, no code fences, no text before or after the array.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}

Here are the existing test cases already generated:
${existingSummaryList}

User Scenario to Test:
"${customScenario}"

Task:
Generate exactly ONE highly detailed, complete test case for the User Scenario specified above. Ensure it does not duplicate any existing cases.

Start the test case ID from ${nextIdStr}.

Each test case MUST follow this EXACT JSON schema:
[
  {
    "id": "${nextIdStr}",
    "summary": "Verify [specific action] under [specific condition]",
    "issueType": "Test",
    "priority": "High",
    "labels": "custom,functional",
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
      }
    ],
    "status": "Not Executed"
  }
]

Rules:
- Make sure to use the ID ${nextIdStr}.
- Write extremely detailed, atomic steps and expected results specific to the user's custom scenario.
- Output the complete JSON array only. Start your response with [ and end with ]`
}

// ─── Playwright TypeScript Test Automation Prompt ──────────────────────────────
const buildAutomatePrompt = (jiraIssue: any, testCases: TestCase[]) => {
  const serializedCases = testCases.map(tc => {
    return `ID: ${tc.id}
Summary: ${tc.summary}
Precondition: ${tc.precondition}
Steps:
${tc.steps.map(s => `  ${s.stepNumber}. Action: ${s.action} | Data: ${s.testData} | Expected: ${s.expectedResult}`).join('\n')}`
  }).join('\n\n')

  return `You are an expert Test Automation Architect specializing in Playwright, TypeScript, and Page Object Model (POM) design patterns. 

Your task is to take the attached test case definition and generate a production-ready, fully functional Playwright automation framework. 

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}

Here are the test cases to automate:
${serializedCases}

### CRITICAL INSTRUCTIONS:
1. NO PLACEHOLDERS: Do not use code comments like "// logic goes here" or "// add assertions here". All loop steps, conditions, configuration arrays, and assertions must be written out as fully executable code.
2. MODULAR ARCHITECTURE: You must separate selectors/actions from the test specs. Implement a clean Page Object Model.
3. ENVIRONMENT AGNOSTIC: Do not hardcode environment base URLs inside the test steps. Use environment variables.
4. ZIP-READY STRUCTURE: Structure your response into a single raw JSON object matching the schema below. Do not output any markdown code fences (like \`\`\`json), no text before or after the JSON, so the application can programmatically parse them into a directory structure and create a downloadble .zip file.

JSON Schema to follow:
{
  "readme": "Markdown content for README.md documenting the architecture, folder structure, prerequisites, setup commands, execution commands, and troubleshooting tips...",
  "packageJson": "package.json content containing current stable versions of @playwright/test, typescript, and dotenv. Include a script for running tests and a script for generating reports...",
  "tsconfigJson": "tsconfig.json content tailored for Playwright (CommonJS/ESNext compatibility)...",
  "playwrightConfig": "playwright.config.ts content configuring the framework to support: A base URL read from environment variables; multi-browser execution (Chromium, Firefox, WebKit) defaulted to Chromium; trace, video, and screenshot collection 'on-first-retry' or 'only-on-failure'; and leveraging global authentication storage state file ('playwright/.auth/user.json') to avoid repetitive logins...",
  "testFiles": [
    {
      "filename": ".env.example",
      "code": "Template for required environment variables (e.g., BASE_URL, TEST_USER, TEST_PASSWORD)..."
    },
    {
      "filename": "tests/auth.setup.ts",
      "code": "Playwright setup test that performs the login workflow exactly once, saves the storage state to 'playwright/.auth/user.json', and allows all subsequent tests to reuse the authenticated session..."
    },
    {
      "filename": "pages/base.page.ts",
      "code": "BasePage class that encapsulates common interactions (e.g., waiting for network idle, custom element clicking, safe text input)..."
    },
    {
      "filename": "pages/form-builder.page.ts",
      "code": "(Adapt this file name/content dynamically based on the input test case context) Create a Page Object class inheriting from BasePage. Map out locator properties using semantic Playwright locators (page.getByRole, page.getByText, page.getByPlaceholder). Implement strongly-typed methods for interactions..."
    },
    {
      "filename": "tests/TC-001.spec.ts",
      "code": "TypeScript Playwright test spec for TC-001. It must import the required Page Objects, be exceptionally clean, readable, and business-focused (delegating technical locator interaction to the Page Objects), and use robust assertions..."
    }
  ]
}

Ensure you generate the complete spec files, Page Object files, environment template, and setup scripts for all the test cases provided in the input list inside the 'testFiles' array.

Output ONLY the raw JSON object. Start with { and end with }`
}

const buildAutomateChunkPrompt = (jiraIssue: any, testCases: TestCase[]) => {
  const serializedCases = testCases.map(tc => {
    return `ID: ${tc.id}
Summary: ${tc.summary}
Precondition: ${tc.precondition}
Steps:
${tc.steps.map(s => `  ${s.stepNumber}. Action: ${s.action} | Data: ${s.testData} | Expected: ${s.expectedResult}`).join('\n')}`
  }).join('\n\n')

  return `You are an expert Test Automation Architect specializing in Playwright, TypeScript, and Page Object Model (POM) design patterns.

Your task is to take the attached test case definition batch and generate fully functional Playwright test spec files and any necessary Page Object classes.

Jira Issue: ${jiraIssue.key}
Summary: ${jiraIssue.summary}

Here are the test cases to automate in this batch:
${serializedCases}

### CRITICAL INSTRUCTIONS:
1. NO PLACEHOLDERS: Do not use code comments like "// logic goes here" or "// add assertions here". All steps and assertions must be written out as fully executable code.
2. MODULAR ARCHITECTURE: You must separate selectors/actions from the test specs. Implement page object pattern class modifications or new page classes if needed for these spec files.
3. ZIP-READY STRUCTURE: Structure your response into a single raw JSON object matching the schema below. Do not output any markdown code fences (like \`\`\`json), no text before or after the JSON.

JSON Schema to follow:
{
  "testFiles": [
    {
      "filename": "pages/form-builder.page.ts",
      "code": "TypeScript Page Object code if new locators/methods are needed for this batch..."
    },
    {
      "filename": "tests/TC-006.spec.ts",
      "code": "TypeScript Playwright test spec for TC-006 importing and utilizing the Page Object model..."
    }
  ]
}

Output ONLY the raw JSON object. Start with { and end with }`
}

const buildExtractTestCasesPrompt = (text: string) => `You are a senior QA architect and test cases extraction specialist.
Analyze the following raw text content from a uploaded test document (PDF/Manual plan) and extract all test cases.

Raw Document Text:
${text}

Task:
Extract all individual test cases described in the text.
Your output must be a single raw JSON array of test case objects. Do not output any markdown code fences (like \`\`\`json), no text before or after the JSON.

Each object in the JSON array must strictly follow this TypeScript interface:
{
  "id": string (e.g. "TC-001", "TC-002", etc.),
  "summary": string (brief, descriptive title of the test case),
  "issueType": string (use "Test"),
  "priority": "Critical" | "High" | "Medium" | "Low",
  "labels": string (comma-separated labels or tags, if any),
  "testType": string (e.g. "Functional", "UI", "API", "Security", etc.),
  "precondition": string (preconditions or setup steps needed before running the test),
  "steps": [
    {
      "stepNumber": number,
      "action": string (the action to perform),
      "testData": string (test input data, or "N/A"),
      "expectedResult": string (expected outcome of the action)
    }
  ],
  "status": string (use "Not Executed"),
  "component": string (component or module name, if any),
  "estimatedTime": string (estimated duration, e.g. "15m", "30m"),
  "scenarioType": "happy_path" | "negative" | "edge_case" | "boundary" | "ui_ux" | "security" | "performance"
}

Extraction Rules:
1. Make sure to capture ALL steps for each test case, preserving their sequence.
2. If step numbers are not explicit, number them starting from 1.
3. Choose the most appropriate scenarioType based on the test case goal (e.g. security checks -> "security", negative scenarios -> "negative", happy path -> "happy_path").
4. Assign priority ('Critical', 'High', 'Medium', 'Low') based on severity.
5. Extract as many test cases as are clearly described in the document.

Output ONLY the raw JSON array. Start with [ and end with ]`

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

  private async callAI(
    provider: AIProvider,
    apiKey: string,
    model: string,
    prompt: string,
    timeoutMs = 300000,
    mediaFiles?: MediaFileData[]
  ): Promise<string> {
    if (!apiKey) throw new Error(`Please configure your ${provider} API key in the settings panel.`)
    if (!model) throw new Error('Please select a model in the settings panel.')

    try {
      let contentPayload: any = prompt

      if (mediaFiles && mediaFiles.length > 0) {
        if (provider === 'gemini') {
          contentPayload = [
            { type: 'text', text: prompt },
            ...mediaFiles.map(file => ({
              type: 'inline_data',
              mimeType: file.mimeType,
              data: file.base64
            }))
          ]
        } else {
          contentPayload = [
            { type: 'text', text: prompt },
            ...mediaFiles.map(file => ({
              type: 'image_url',
              image_url: {
                url: `data:${file.mimeType};base64,${file.base64}`
              }
            }))
          ]
        }
      }

      const response = await axios.post(`${API_BASE}/${provider}/complete`, {
        apiKey,
        model,
        messages: [{ role: 'user', content: contentPayload }]
      }, { timeout: timeoutMs })

      return response.data.content || response.data.response?.choices?.[0]?.message?.content || ''
    } catch (error: any) {
      if (error.response?.status === 401) throw new Error(`Authentication failed for ${provider}. Check your API key.`)
      if (error.response?.status === 429) throw new Error(`Rate limited by ${provider}. Please try again in a moment.`)
      throw new Error(error.response?.data?.error || error.message || 'AI generation failed')
    }
  }

  async generateTestStrategy(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    mediaFiles?: MediaFileData[]
  ): Promise<string> {
    const prompt = buildTestStrategyPrompt(jiraIssue)
    return this.callAI(provider, apiKey, model, prompt, 300000, mediaFiles)
  }

  async generateTestPlan(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    testStrategy?: string,
    mediaFiles?: MediaFileData[]
  ): Promise<string> {
    const prompt = buildTestPlanPrompt(jiraIssue, testStrategy)
    return this.callAI(provider, apiKey, model, prompt, 300000, mediaFiles)
  }

  async generateTestCases(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    testPlan?: string,
    mediaFiles?: MediaFileData[]
  ): Promise<TestCase[]> {
    const prompt = buildTestCasesPrompt(jiraIssue, testPlan)
    const raw = await this.callAI(provider, apiKey, model, prompt, 300000, mediaFiles)

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

  async generateMoreTestCases(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    existingCases: TestCase[]
  ): Promise<MoreTestCasesResponse> {
    // Extract maximum number from IDs like "TC-015"
    let maxNum = 0
    existingCases.forEach(tc => {
      const match = tc.id.match(/TC-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    const startIdIndex = maxNum + 1

    const prompt = buildMoreTestCasesPrompt(jiraIssue, existingCases, startIdIndex)
    const raw = await this.callAI(provider, apiKey, model, prompt, 300000)

    // Check if the response indicates no more cases
    if (raw.includes('noMoreCases') || raw.includes('"noMoreCases": true')) {
      return { testCases: [], noMoreCases: true }
    }

    try {
      const parsed = this.parseTestCasesJSON(raw)
      return { testCases: parsed, noMoreCases: parsed.length === 0 }
    } catch (err) {
      if (raw.toLowerCase().includes('no more') || raw.toLowerCase().includes('fully covered')) {
        return { testCases: [], noMoreCases: true }
      }
      throw err
    }
  }

  async generateCustomTestCase(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    existingCases: TestCase[],
    customScenario: string
  ): Promise<TestCase> {
    let maxNum = 0
    existingCases.forEach(tc => {
      const match = tc.id.match(/TC-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    const startIdIndex = maxNum + 1

    const prompt = buildCustomTestCasePrompt(jiraIssue, existingCases, startIdIndex, customScenario)
    const raw = await this.callAI(provider, apiKey, model, prompt, 300000)
    const parsed = this.parseTestCasesJSON(raw)
    if (parsed.length > 0) return parsed[0]
    throw new Error('Could not parse the custom test case response from the AI.')
  }

  async extractTestCasesFromText(
    provider: AIProvider,
    apiKey: string,
    model: string,
    text: string
  ): Promise<TestCase[]> {
    const prompt = buildExtractTestCasesPrompt(text)
    const raw = await this.callAI(provider, apiKey, model, prompt, 300000)
    return this.parseTestCasesJSON(raw)
  }

  async generatePlaywrightTests(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any,
    testCases: TestCase[]
  ): Promise<PlaywrightAutomationData> {
    if (testCases.length === 0) {
      return {
        readme: '# Playwright Test Suite\nNo test cases provided.',
        packageJson: '{}',
        tsconfigJson: '{}',
        playwrightConfig: '',
        testFiles: []
      }
    }

    const chunkSize = 5
    const chunks: TestCase[][] = []
    for (let i = 0; i < testCases.length; i += chunkSize) {
      chunks.push(testCases.slice(i, i + chunkSize))
    }

    // Generate first batch with the full template configuration
    const firstChunk = chunks[0]
    const firstPrompt = buildAutomatePrompt(jiraIssue, firstChunk)
    const firstRaw = await this.callAI(provider, apiKey, model, firstPrompt, 300000)
    const result = this.parseAutomationJSON(firstRaw)

    // Generate subsequent batches in sequence (safer for rate limits than parallel)
    for (let c = 1; c < chunks.length; c++) {
      const chunk = chunks[c]
      const chunkPrompt = buildAutomateChunkPrompt(jiraIssue, chunk)
      try {
        const chunkRaw = await this.callAI(provider, apiKey, model, chunkPrompt, 300000)
        const chunkData = this.parseAutomationJSON(chunkRaw)
        if (chunkData.testFiles && chunkData.testFiles.length > 0) {
          result.testFiles.push(...chunkData.testFiles)
        }
      } catch (err) {
        console.error(`Failed to automate chunk ${c + 1}:`, err)
        // Fallback: create mock/draft specs if a chunk call fails, so we don't fail the whole process
        chunk.forEach(tc => {
          result.testFiles.push({
            filename: `tests/${tc.id}.spec.ts`,
            code: `import { test, expect } from '@playwright/test';\n\n// TODO: Failed to generate automation for ${tc.id} automatically.\n// Summary: ${tc.summary}\n// Precondition: ${tc.precondition}\n\ntest('${tc.id} - ${tc.summary.replace(/'/g, "\\'")}', async ({ page }) => {\n  // Manual automation needed\n});`
          })
        })
      }
    }

    return result
  }

  private parseAutomationJSON(raw: string): PlaywrightAutomationData {
    // Strategy 1: Remove markdown code fences
    let cleaned = raw
      .replace(/^```(?:json|JSON)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .replace(/```/g, '')
      .trim()

    // Strategy 2: Extract text between first { and last }
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    }

    // Strategy 3: Try parsing the extracted string directly
    try {
      const parsed = JSON.parse(cleaned)
      if (parsed.playwrightConfig || parsed.readme || (parsed.testFiles && parsed.testFiles.length > 0)) {
        return parsed as PlaywrightAutomationData
      }
    } catch { /* continue */ }

    // Strategy 4: Fix common JSON issues then parse
    const fixed = cleaned
      .replace(/,\s*([}\]])/g, '$1')           // trailing commas before } or ]
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys
      .replace(/[\x00-\x1F\x7F]/g, ' ')         // control characters
      .trim()

    try {
      const parsed = JSON.parse(fixed)
      if (parsed.playwrightConfig || parsed.readme || (parsed.testFiles && parsed.testFiles.length > 0)) {
        return parsed as PlaywrightAutomationData
      }
    } catch { /* continue */ }

    // Strategy 5: Markdown extraction fallback
    const files: PlaywrightAutomationFile[] = []
    let readme = ''
    let packageJson = ''
    let tsconfigJson = ''
    let playwrightConfig = ''

    // Match file markers like ### File: filename or **File:** filename
    const fileBlockRegex = /(?:###\s+File:\s*|File:\s*`?|`)([a-zA-Z0-9_\-\.\/]+)`?[\s\S]*?```(?:typescript|ts|javascript|js|json|markdown|md|sh)?\n([\s\S]*?)```/g
    let match
    while ((match = fileBlockRegex.exec(raw)) !== null) {
      const path = match[1].trim()
      const content = match[2].trim()

      if (path === 'package.json') {
        packageJson = content
      } else if (path === 'tsconfig.json') {
        tsconfigJson = content
      } else if (path.includes('playwright.config')) {
        playwrightConfig = content
      } else if (path === 'README.md' || path.toLowerCase() === 'readme') {
        readme = content
      } else {
        files.push({ filename: path, code: content })
      }
    }

    if (files.length > 0 || playwrightConfig || packageJson) {
      return {
        readme: readme || '# Playwright Test Suite\nGenerated automatically by QA Nexus Framework.',
        packageJson: packageJson || '{\n  "name": "playwright-tests",\n  "version": "1.0.0",\n  "devDependencies": {\n    "@playwright/test": "^1.40.0",\n    "typescript": "^5.0.0"\n  }\n}',
        tsconfigJson: tsconfigJson || '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "commonjs",\n    "moduleResolution": "node",\n    "sourceMap": true,\n    "outDir": "./dist"\n  }\n}',
        playwrightConfig: playwrightConfig || "import { defineConfig } from '@playwright/test';\nexport default defineConfig({\n  use: { headless: true, screenshot: 'only-on-failure' },\n});",
        testFiles: files
      }
    }

    // Strategy 6: Single-file fallback if it failed to extract folders
    const anyTsBlockRegex = /```(?:typescript|ts)\n([\s\S]*?)```/g
    const tsMatches = [...raw.matchAll(anyTsBlockRegex)]
    if (tsMatches.length > 0) {
      const combinedCode = tsMatches.map(m => m[1]).join('\n\n')
      return {
        readme: '# Playwright Test Suite\nGenerated automatically by QA Nexus Framework.',
        packageJson: '{\n  "name": "playwright-tests",\n  "version": "1.0.0",\n  "devDependencies": {\n    "@playwright/test": "^1.40.0",\n    "typescript": "^5.0.0"\n  }\n}',
        tsconfigJson: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "commonjs",\n    "moduleResolution": "node",\n    "sourceMap": true,\n    "outDir": "./dist"\n  }\n}',
        playwrightConfig: "import { defineConfig } from '@playwright/test';\nexport default defineConfig({\n  use: { headless: true, screenshot: 'only-on-failure' },\n});",
        testFiles: [{ filename: 'tests/automated-tests.spec.ts', code: combinedCode }]
      }
    }

    throw new Error('Could not parse the automated tests output from the AI. The response was not in a valid JSON structure or markdown file format.')
  }
}

export default new AIService()
