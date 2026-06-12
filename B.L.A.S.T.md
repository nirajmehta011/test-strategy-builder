## 🟢 Protocol 0: Initialization (Mandatory)
Before any code is written or tools are built:

1. **Initialize Project Memory**
    - Create:
        - `task_strategy.md`  → Phases, goals, and checklists
        - `findings.md`  → Research, discoveries, constraints
        - `progress.md`  → What was done, errors, tests, results

    - Initialize `gemini.md`  as the **Project Constitution**:
        - Data schemas
        - Behavioral rules
        - Architectural invariants


2. **Halt Execution** You are strictly forbidden from writing scripts in `tools/`  until:
    - Discovery Questions are answered
    - The Data Schema is defined in `gemini.md` 
    - `task_plan.md`  has an approved Blueprint



## 🏗️ Phase 1: B - Blueprint (Vision & Logic)
**1. Discovery:** Ask the user the following 5 questions:

- **North Star:** What is the singular desired outcome?
- **Integrations:** Which external services (Slack, Shopify, etc.) do we need? Are keys ready?
- **Source of Truth:** Where does the primary data live?
- **Delivery Payload:** How and where should the final result be delivered?
- **Behavioral Rules:** How should the system "act"? (e.g., Tone, specific logic constraints, or "Do Not" rules).
**2. Data-First Rule:** You must define the **JSON Data Schema** (Input/Output shapes) in `gemini.md`. Coding only begins once the "Payload" shape is confirmed.

**3. Research:** Search github repos and other databases for any helpful resources for this project

## Phase 2: L - Link (Connectivity)
**1. Verification:** Test all API connections and `.env` credentials. **2. Handshake:** Build minimal scripts in `tools/` to verify that external services are responding correctly. Do not proceed to full logic if the "Link" is broken.

---

## ⚙️ Phase 3: A - Architect (The 3-Layer Build)
You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic; business logic must be deterministic.

**Layer 1: Architecture (**`**architecture/**`**)**

- Technical SOPs written in Markdown.
- Define goals, inputs, tool logic, and edge cases.
- **The Golden Rule:** If logic changes, update the SOP before updating the code.
**Layer 2: Navigation (Decision Making)**

- This is your reasoning layer. You route data between SOPs and Tools.
- You do not try to perform complex tasks yourself; you call execution tools in the right order.
**Layer 3: Tools (**`**tools/**`**)**

- Deterministic Python scripts. Atomic and testable.
- Environment variables/tokens are stored in `.env` .
- Use `.tmp/`  for all intermediate file operations.
---

## ✨ Phase 4: S - Stylize (Refinement & UI)
**1. Payload Refinement:** Format all outputs (Slack blocks, Notion layouts, Email HTML) for professional delivery. **2. UI/UX:** If the project includes a dashboard or frontend, apply clean CSS/HTML and intuitive layouts. **3. Feedback:** Present the stylized results to the user for feedback before final deployment.

---

## 🛰️ Phase 5: T - Trigger (Deployment)
**1. Cloud Transfer:** Move finalized logic from local testing to the production cloud environment. **2. Automation:** Set up execution triggers (Cron jobs, Webhooks, or Listeners). **3. Documentation:** Finalize the **Maintenance Log** in `gemini.md` for long-term stability.

---

## 🧪 Test Plan Generation Methodology

The QA Nexus framework extends its output standard for QA documentation with the standard 6-section test plan methodology:

| Section | Dimension | Description |
|---------|-----------|-------------|
| **1** | Objectives & Scope | In-Scope vs. Out-of-Scope definitions derived from specs |
| **2** | Test Strategy & Types | Functional, Integration, Regression, Security, Performance, UI/UX justifications |
| **3** | Environment & Tools | Recommended hardware, software platforms, and test execution tools |
| **4** | Entry & Exit Criteria | Quality gate conditions to start, pause, resume, and sign off/deploy |
| **5** | Deliverables & Defect Management | QA outputs and standard defect severity/priority classifications |
| **6** | Risks & Mitigation | Potential project bottlenecks, resource risks, and mitigations |

### Output Standards (v4.1)

QA Nexus generators produce four distinct artifact types and support direct file-based workflows:

1. **Test Strategy** — Risk-based 10-section QA approach document. Export: Markdown, JSON.
2. **Test Plan** — Full professional 6-section test plan document. Export: PDF, DOCX, Markdown.
3. **Test Cases** — Jira/Zephyr Scale–compatible detailed cases, dynamically sized based on ticket complexity (enforcing at least 10-15 cases initially).
   - **Incremental Expansion**: Ability to think and append 5-10 additional cases sequentially (TC-019+) without duplicating existing ones.
   - **Custom Scenario Addition**: If all possible standard cases are covered, the user can describe specific workflows or boundary conditions to generate custom test cases dynamically.
   - **Export**: CSV (Jira bulk import).
4. **Playwright TS Automation** — Fully structured Playwright automation project in TypeScript.
   - **Direct CSV Upload**: Support uploading any Jira/Zephyr-compatible test cases CSV file directly to parse, load, and generate Playwright test cases immediately.
   - **Structure**: Includes `package.json`, `tsconfig.json`, `playwright.config.ts`, `README.md`, and individual `.spec.ts` files under `tests/` for each automated case.
   - **Export**: Markdown summary, ZIP bundle containing the ready-to-use directory structure.

### Test Case Quality Standards

Each AI-generated test case MUST:
- Have a unique ID (TC-001, TC-002, …)
- Include a precise precondition statement
- Contain 4-8 atomic action steps (one action per step, detailing minor actions and inputs)
- Specify exact test data for each step
- Include a measurable expected result per step
- Be classified by scenario type and priority
- Map to a specific component under test

### Behavioral Rules for QA Generation

- **Specificity**: Reference exact field names, button labels, and values from the source ticket.
- **Atomic Actions**: Explicitly write out minor inputs and navigation steps (e.g. click field, type value, press enter) instead of high-level descriptions.
- **Adversarial Thinking**: Always think like someone trying to break the system.
- **Coverage Distribution**: Minimum 25% Happy Path, 20% Negative, 15% Boundary, 15% Edge, 10% UI/UX, 10% Security, 5% Performance.
- **No Generic Cases**: Each case must be specific to the feature — no copy-paste filler.

