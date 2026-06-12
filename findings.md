# Findings

## Objective Pivot
- **Original:** CLI tool for test strategy generation
- **Updated:** Lightweight React SPA with Settings + Test Strategy Generator
- **v2.0:** Full UI overhaul — persistent left-pane settings, multi-provider AI support

## Tech Stack
- Frontend: React 18 + TypeScript (functional components, hooks, Context API)
- Build: Vite 5 + TailwindCSS 3
- Backend Proxy: Express.js (server.mjs) — required for CORS bypass on all AI/Jira APIs
- Storage: localStorage (key: `blast_settings_v2`)
- Fonts: Inter (Google Fonts) + JetBrains Mono

## Environment Configuration
### Root `.env` (for reference / future server-side use)
- `GROQ_KEY` – Groq API key
- `JIRA_EMAIL` – Jira user email
- `JIRA_TOKEN` – Jira API token
- `JIRA_URL` – Jira base URL
- `OPENROUTER_KEY` – OpenRouter API key (optional)
- `GEMINI_KEY` – Google Gemini API key (optional)
- `OPENAI_KEY` – OpenAI API key (optional)

### App `.env.local`
- `VITE_API_URL=http://localhost:3001/api` — backend proxy address (local fallback only)

### Vercel Serverless Architecture (v2.2)
- **Zero CORS in Production:** The Express backend runs as a Vercel Serverless Function under `app/api/index.mjs` using `@vercel/node`.
- **Dynamic API Base Resolution:** Frontend API bases (`API_BASE`) resolve dynamically depending on current hostname:
  - If `localhost`/`127.0.0.1` (local dev) → `http://localhost:3001/api`
  - If hosted (Vercel deployment) → `/api` (same origin proxying to Vercel Serverless Function)
- **Vercel Routing:** Handled via `app/vercel.json` rewrites (`/api/*` to serverless function, everything else to SPA `/index.html`).

## AI Provider Support (v2.0)
| Provider | API Base | Free Tier | Key Format |
|---|---|---|---|
| **Groq** | api.groq.com | ✅ Yes | `gsk_...` |
| **OpenRouter** | openrouter.ai/api/v1 | ✅ Credits | `sk-or-...` |
| **Gemini** | generativelanguage.googleapis.com | ✅ Yes | `AIza...` |
| **OpenAI** | api.openai.com | ❌ Paid | `sk-...` |

## Core Features (v5.0)
1. **Persistent Left-Pane Settings** — always visible, collapsible sections.
2. **Multi-provider AI** — Groq, OpenRouter, Gemini, OpenAI switchable via provider pills.
3. **Live Model Loading** — fetches real model lists from each provider on test.
4. **Default Model Lists** — works offline (falls back to curated model lists).
5. **Jira Connection Testing** — validate credentials before generation.
6. **AI Connection Testing** — verify API key + fetch live models.
7. **Jira Issue Fetch** — auto-pull summary, description, priority, status.
8. **3-Mode Generator** — selectable via mode button pills (Strategy / Test Plan / Test Cases).
9. **Test Strategy Generation** — 10-section risk-based QA strategy in markdown.
10. **Test Plan Generation (RICE-POT)** — Full IEEE 829 document with all 7 dimensions.
11. **Dynamic Test Case Counts** — ticket complexity determines initial test case counts (enforcing at least 10-15 cases initially) instead of a hardcoded 15.
12. **Incremental Test Case Expansion** — "Add More Test Cases" button generates 5-10 additional test cases (starting at next TC number, e.g. TC-019) and merges them into the table.
13. **Playwright + TypeScript Automation** — "Automate Test Cases" button generates a full Playwright automation framework with specs for each test case.
14. **Direct CSV Import & Automation (v4.2)** — Added "Automate Any Cases" module in the selector allowing users to drag and drop or browse any test cases CSV file (with flexible column headers like Name/Summary, Objective/Description, and automatic delimiter detection) to parse and generate automated Playwright suites immediately.
15. **Adaptive Custom Scenarios** — Detects when standard cases are fully covered, providing a custom scenario input panel where users can type specific workflows to generate new test cases on-demand.
16. **Interactive Framework Explorer** — View generated configs (`package.json`, `playwright.config.ts`, `tsconfig.json`) and test specs in a tabbed UI code preview.
17. **Automation Exports** — Download Playwright tests as a detailed markdown file or a ready-to-run ZIP bundle.
18. **PDF & DOCX Export** — Styled RICE-POT test plan with title page, colored section headers.
19. **CSV Export (Jira Import)** — Test cases as Jira-bulk-importable CSV with all required columns.
20. **Test Cases Table** — Filterable by scenario type, searchable, sortable.
21. **Expandable Test Case Rows** — Click any case to reveal all granular steps inline.
22. **Statistics Dashboard** — Case count, step count, per-type breakdown at a glance.
23. **Output Tabs** — All 3 generation outputs persist independently; switch between them via tabs.
24. **Dark Mode** — default dark, persisted to localStorage.
25. **Complete Batch Automation (v4.2)** — Automated test case suites are chunked into batches of 5, preventing Vercel function timeouts and ensuring complete Playwright code is written for every single test case without placeholders.
26. **Excel & PDF Automation Support (v4.3)** — Extended "Automate Any Cases" to accept Excel (.xlsx, .xls) and PDF (.pdf) files directly. Excel files are parsed client-side via SheetJS, and PDFs are parsed via client-side PDF.js followed by AI-driven test case extraction.
27. **Page Object Model Prompt Architecture (v4.4)** — Configured the automation generators to output Playwright test code structured according to the modular Page Object Model (POM) design pattern, featuring global setups, environment configurations, and complete spec files.
28. **Multi-Input Spec Context & Rebranding (v4.5)** — Rebranded the platform to **QA Nexus** and added support for generating Test Strategies, Test Plans, and Test Cases from Jira issues, Website URLs (via backend proxy scraping), and Specification Documents (.txt, .md, .pdf, .docx, .doc parsed client-side).
29. **Complete QA Flow Pipeline (v5.0)** — Runs Strategy → Plan → Cases → Playwright POM Automation sequentially from a single click. Displays execution progress using an interactive timeline with steps, durations, and logs, and provides a "Download All QA Assets" ZIP compiler.
30. **Extended Timeouts & Advanced Principal QA Persona (v5.1)** — Upgraded Axios timeouts to 300000ms (5 mins) across server proxy & React app, configured Vercel serverless functions `maxDuration` to 300s, and introduced an elite Principal QA Automation Engineer prompt to generate 15-30 comprehensive test cases grouped into 7 specific QA buckets.

## New Dependencies (v4.1)
| Package | Version | Purpose |
|---------|---------|---------|
| `jspdf` | ^2.x | Client-side PDF generation |
| `jspdf-autotable` | ^3.x | Table support in PDF |
| `docx` | ^9.x | Word DOCX generation |
| `jszip` | ^3.x | Client-side ZIP file generation |
| `mammoth` | ^1.6.0 | Client-side Word .docx to plain text parser |



## Bug Fixes (v2.0)
- **Jira API URL Fix:** Backend was calling `/rest/api/3/issues/` → corrected to `/rest/api/3/issue/` (Jira Cloud REST API v3)
- **Groq-only validation** removed — any provider can be used
- **Settings persistence** upgraded to `blast_settings_v2` key (merges new fields gracefully)
- **ADF Parsing Fix (v2.1):** Jira Cloud API v3 returns `description` as an **Atlassian Document Format (ADF)** JSON object, not a plain string. `jiraService.ts` now includes `adfToText()` which recursively walks the ADF node tree (paragraphs, lists, headings, code blocks, inline cards, etc.) to extract readable plain text before PII sanitization. Handles `null`, plain strings (Jira Server), and ADF objects (Jira Cloud).

## Key Constraints
- All API calls go through backend proxy (port 3001) to avoid CORS issues
- No PII in generated test strategies (email/phone sanitized from Jira descriptions)
- Multi-project Jira support (any accessible project with credentials)
- Lightweight: minimal dependencies, fast startup
