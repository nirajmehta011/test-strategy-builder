# Progress

## Phase 0: Initialization ✅
- Initialized BLAST framework memory files.
- Discovered initial requirements and created task_plan.md.

## Phase 1: Blueprint ✅
- Collected discovery answers for output format, Jira integration, required sections, delivery, and constraints.
- **Pivot to React SPA:** Updated objective to React app instead of CLI tool.
- Confirmed architecture: React frontend + Jira Cloud API + Groq API.
- Defined data schema for settings, Jira responses, and test strategy output.
- Verified .env file with required credentials.

## Phase 2: Link ✅ (Partial)
- ✅ Environment variables verified and loaded correctly
- ✅ Jira API connection verified (nikstest.atlassian.net)
- ⚠️ Groq API organization restricted (account-level issue, not API integration issue)
- Created verification scripts: verify_env.py, verify_jira.py, verify_groq.py

## Phase 3: Architect ✅
- ✅ Created comprehensive 3-layer architecture documentation
- ✅ Designed SOPs for: Settings Management, Jira Issue Fetch, Test Strategy Generation, File Export
- ✅ Defined React component structure and state management using Context API
- ✅ Planned API service utilities: jiraService, groqService, storageService, exportService
- ✅ Created data flow diagrams and component hierarchy

## Phase 4: Stylize ✅ (v1.0) → ✅ Enhanced (v2.0)

### v1.0 (Initial)
- ✅ Built React SPA with Vite and TypeScript
- ✅ Implemented all UI components (Header, SettingsPage, TestStrategyPage, JiraIDInput, StrategyDisplay, ExportButtons)
- ✅ Implemented Context API for settings management
- ✅ Created service utilities: jiraService, groqService, exportService
- ✅ Applied TailwindCSS styling with dark mode support
- ✅ Added connection testing buttons in settings

### v2.0 (UI Overhaul + Multi-Provider AI) ✅
- ✅ **Premium CSS redesign** — Inter font, glassmorphism sidebar, CSS custom properties, animated transitions
- ✅ **Persistent Left-Pane Layout** — `LeftPanel.tsx` replaces separate Settings page; always visible
- ✅ **Multi-Provider AI** — Groq, OpenRouter, Gemini, OpenAI supported via unified `aiService.ts`
- ✅ **Provider Pills UI** — clickable 2×2 grid to switch AI provider
- ✅ **Per-provider API key storage** — each provider stores its own key in context/localStorage
- ✅ **Live Model Loading** — Test button fetches actual models from each provider API
- ✅ **Default Model Fallbacks** — curated model lists per provider (works without testing)
- ✅ **Backend expanded** — server.mjs now has routes for Groq, OpenRouter, Gemini, OpenAI
- ✅ **Jira API bug fix** — `/rest/api/3/issues/` → `/rest/api/3/issue/`
- ✅ **Dark mode default** — app starts in dark mode (premium look)
- ✅ **Split-pane App layout** — Header + [LeftPanel | MainContent]
- ✅ **SettingsContext v2** — extended schema with all provider keys, granular update methods
- ✅ **Enhanced components** — JiraIDInput, StrategyDisplay, StrategyCard, ExportBar all redesigned
- ✅ **Updated BLAST docs** — findings.md, progress.md, .env, .env.example all current

## Phase 5: Trigger ✅
- ✅ App running locally via `npm run dev:full` (port 5173 + 3001)
- ✅ Converted Express server to Serverless Function for Vercel
- ✅ Set up `app/vercel.json` rewrites and routing rules
- ✅ Made frontend API routing dynamic (automatically proxies to serverless in production)
- ✅ Fixed strict TS compiler configurations to allow seamless Vercel production build
- ✅ Cleaned up all legacy JS files and dead components
- ✅ Pushed all changes to GitHub main branch

## Vercel Deployment Instructions
1. Import repository `test-strategy-builder` on Vercel dashboard.
2. Set the **Root Directory** setting to `app`.
3. Keep standard settings (Vercel automatically detects Vite).
4. Click Deploy! No environment variables are strictly required since keys are managed dynamically in-app.

## Known Issues / Watch List
- Groq API account restriction (org-level, not code issue) — mitigated by multi-provider support
- OpenAI models endpoint requires valid paid API key to list models
- Gemini free-tier rate limits may apply for heavy usage
- Test Plan / Test Cases prompts are large — generation takes 45-90s, handled with extended timeouts

## v3.0 – Test Plan + Test Case Generator ✅

### New Features Implemented

- ✅ **3-Mode Generator UI** — `JiraIDInput.tsx` upgraded with mode pill selector (Strategy / Test Plan / Test Cases)
- ✅ **RICE-POT Test Plan Generator** — `aiService.ts` — comprehensive IEEE 829–aligned test plan prompt (7 dimensions)
- ✅ **Jira/Zephyr Test Case Generator** — `aiService.ts` — 25+ test cases in structured JSON format, all scenario types
- ✅ **Output Tabs** — Persistent tabbed display so Strategy, Plan, and Cases all stay independently visible
- ✅ **TestPlanDisplay.tsx** — Renders full RICE-POT plan with framework banner showing all 7 dimensions
- ✅ **TestCasesDisplay.tsx** — Full filterable/searchable table with expandable step rows
  - Statistics bar: Total Cases, Total Steps, Functional, Edge, Security, Boundary
  - Filter pills: All / Happy Path / Negative / Edge / Boundary / UI-UX / Security / Performance
  - Sort by: ID / Priority / Type
  - Expandable rows: Click to reveal all atomic steps with action, test data, expected result
- ✅ **PDF Export** — Styled PDF with title page, colored RICE-POT section headers, footer with page numbers
- ✅ **DOCX Export** — Word-compatible document with heading hierarchy via `docx` package
- ✅ **CSV Export** — Jira bulk import–compatible CSV with all required columns (Summary, Issue Type, Priority, Labels, Test Type, Step, Data, Expected Result)
- ✅ **Enhanced Empty State** — Shows 3 mode cards describing each generation type and its exports
- ✅ **B.L.A.S.T.md updated** — RICE-POT methodology table + QA output standards + test case quality rules
- ✅ **New packages** — `jspdf`, `jspdf-autotable`, `docx`
- ✅ **Build verified** — `npm run build` exits 0 with 640 modules transformed

### Files Modified
| File | Change |
|------|--------|
| `src/services/aiService.ts` | Added RICE-POT prompt, test cases prompt, 3 generation methods |
| `src/services/exportService.ts` | Added PDF, DOCX, CSV export functions |
| `src/components/JiraIDInput.tsx` | 3-mode selector UI |
| `src/components/TestStrategyPage.tsx` | Multi-mode orchestration, output tabs |
| `src/components/TestPlanDisplay.tsx` | NEW — RICE-POT plan renderer + export bar |
| `src/components/TestCasesDisplay.tsx` | NEW — Filterable table + step expansion + CSV export |
| `src/styles/globals.css` | +530 lines of new component styles |
| `B.L.A.S.T.md` | RICE-POT methodology documentation |
| `findings.md` | v3.0 feature list update |
| `package.json` | New deps: jspdf, jspdf-autotable, docx |

## v4.0 – Playwright Test Automation + Dynamic Test Cases ✅

### New Features Implemented
- ✅ **Dynamic Test Case Counts** — ticket complexity determines initial test case counts (12-20) instead of a hardcoded 15
- ✅ **Incremental Test Case Expansion** — "Add More Test Cases" button generates 10-15 additional test cases (starting at next TC number, e.g. TC-019) and merges them into the table
- ✅ **Playwright + TypeScript Automation** — "Automate Test Cases" button generates a full Playwright automation framework with specs for each testcase
- ✅ **Interactive Framework Explorer** — View generated configs (`package.json`, `playwright.config.ts`, `tsconfig.json`) and test specs in a tabbed UI code preview
- ✅ **Automation Exports** — Download Playwright tests as a detailed markdown file or a ready-to-run ZIP bundle containing the framework folder structure
- ✅ **New package** — `jszip`

### Files Modified
| File | Change |
|------|--------|
| `src/services/aiService.ts` | Dynamic test cases count prompt, more test cases prompt, playwright TS automation prompt + parser |
| `src/services/exportService.ts` | exportPlaywrightAsMD and exportPlaywrightAsZip using JSZip |
| `src/components/TestStrategyPage.tsx` | Store JIRA issue, add states for incremental generation & automation, pass down to view |
| `src/components/TestCasesDisplay.tsx` | Add actions panel (buttons for incremental generation & automation), tabbed code viewer, downloads |
| `src/styles/globals.css` | Playwright framework styles, green export button style, small loading spinner CSS |
| `B.L.A.S.T.md` | Added Playwright automation outputs and dynamic counts to standard |
| `findings.md` | v4.0 features list update |
| `package.json` | New deps: jszip, @types/jszip |

## v4.1 – Enforced Counts, Custom Scenarios & Direct CSV Upload ✅

### New Features Implemented
- ✅ **First Run Case Enforcement** — Configured prompts to guarantee at least 10 to 15 cases in the initial generation, avoiding truncation or model laziness.
- ✅ **All-Cases-Covered Detection & Custom Scenarios** — AI can now declare all scenarios are covered (returns `noMoreCases`) and show an interactive alert prompting the user to supply a custom scenario. Users can add custom scenarios on-demand which generate custom cases and merge them.
- ✅ **Direct CSV Upload & Automation** — Users can upload test cases CSV files (generated by the app or third-party Jira imports). The app parses it on the client side, loads the test cases, and automatically initiates the Playwright TypeScript automation framework generator.

### Files Modified
| File | Change |
|------|--------|
| `src/services/exportService.ts` | Added parseCSVToTestCases client-side parser utility |
| `src/services/aiService.ts` | Added custom scenario prompt, updated incremental generation to detect all-cases-covered |
| `src/components/JiraIDInput.tsx` | Added CSV file browse/drop upload mode, file parsing, and action triggers |
| `src/components/TestStrategyPage.tsx` | Caches mock CSV issues, orchestrates direct CSV automation and custom scenario generators |
| `src/components/TestCasesDisplay.tsx` | Appends noMoreCases alerts, text box inputs for custom scenarios, and submit buttons |
| `B.L.A.S.T.md` | v4.1 standards documentation (dynamic cases, direct CSV, custom scenarios) |
| `findings.md` | Update feature log and versions |


## v4.2 – Robust CSV Header Parsing & Complete Batch Automation ✅

### New Features Implemented
- ✅ **Normalized Column Mapping & Delimiter Autodetect** — Supported dynamic separator detection and normalized header mapping (stripping punctuation/spaces for exact and substring alias checks) to handle flexible CSV uploads (e.g. mapping `Name/Summary` and `Objective/Description`).
- ✅ **Sequential Client-Side Batch Automation** — Divided test case automation requests into chunks of 5. This avoids Vercel's 10-second timeout limits and Gemini's 4000 output token limit, fully implementing Playwright TypeScript code for all spec files in the suite.
- ✅ **Consistent UI Labeling** — Renamed CSV action labels to "Automate Any Cases" in the user interface.

### Files Modified
| File | Change |
|------|--------|
| `src/services/exportService.ts` | Upgraded `parseCSVToTestCases` with dynamic delimiter logic, normalization helper, and expanded aliases. |
| `src/services/aiService.ts` | Updated `generatePlaywrightTests` to batch requests in sizes of 5, added chunk prompts, and merged results with graceful fallbacks. |
| `src/components/JiraIDInput.tsx` | Renamed CSV action button to "Automate Any Cases" and softened exact mapping validation error text. |

## v4.3 – Excel and PDF Support for "Automate Any Cases" ✅

### New Features Implemented
- ✅ **Excel Upload Parser** — Dynamically load SheetJS from CDN, read array buffer of uploaded xlsx/xls sheets, and convert to CSV format for processing.
- ✅ **PDF Upload Parser** — Dynamically load PDF.js from CDN, parse array buffer to extract plain text from all pages.
- ✅ **AI-Driven PDF Extraction** — Send PDF text to the AI model to structure and extract test cases matching the JSON schema, then automate the suite.
- ✅ **File Accept Filter** — Modified drag-and-drop zone to accept `.csv`, `.xlsx`, `.xls`, and `.pdf` files.

### Files Modified
| File | Change |
|------|--------|
| `src/services/exportService.ts` | Added script loading utility, SheetJS Excel reader, and PDF.js text extractor. |
| `src/services/aiService.ts` | Added PDF test case extraction prompt and callAI query handler. |
| `src/components/TestStrategyPage.tsx` | Renamed orchestrator to handleAutomateFile, calling AI extraction for PDF raw text inputs. |
| `src/components/JiraIDInput.tsx` | Expanded accept tags, routed file buffers by suffix format, and renamed props to onAutomateFile. |

## v4.4 – POM Playwright Prompt Integration ✅

### New Features Implemented
- ✅ **POM Architecture Prompts** — Rewrote generator prompts to enforce modular, structured directories containing setup specs, Page Object classes, environment variable mock configuration files, and clean test spec files.
- ✅ **No-Placeholder Rule** — Configured prompts to demand fully executable code blocks for assertions and loop data objects, preventing mock/draft comment structures.

### Files Modified
| File | Change |
|------|--------|
| `src/services/aiService.ts` | Updated `buildAutomatePrompt` and `buildAutomateChunkPrompt` to use Page Object Model blueprints. |

## v4.5 – Rebranding to QA Nexus & Multi-Input QA Suite ✅

### New Features Implemented
- ✅ **Rebranded to QA Nexus** — Rebranded all user-facing names from "BLAST Test Strategy Builder" / "BLAST QA Generator" to "QA Nexus" / "QA Nexus Suite".
- ✅ **Multi-Input Spec Context** — Extended Strategy, Plan, and Test Cases generators to accept Jira Issue ID, Website URL (scraped via proxy and cleaned), or Spec Document (.txt, .md, .pdf, .docx, .doc) inputs.
- ✅ **Client-side Docx Parsing** — Dynamic Mammoth.js integration to extract raw text content from uploaded Word docs.
- ✅ **Dynamic Feature List** — Refactored empty-state cards to render dynamically from a statically defined `SUPPORTED_FEATURES` array, maintaining easy extensibility.

### Files Modified
| File | Change |
|------|--------|
| `src/components/Header.tsx` | Rebranded title and subtitle to QA Nexus |
| `src/components/LeftPanel.tsx` | Rebranded footer version to QA Nexus |
| `src/components/TestStrategyPage.tsx` | Rebranded title, implemented URL scraping proxy call, spec document parsing routing, and dynamic empty state feature cards |
| `src/components/JiraIDInput.tsx` | Redefined onGenerate callback, added input source selection UI, added URL and Doc upload forms, added docx parser |
| `src/services/exportService.ts` | Added cleanHTMLToText and parseDocxToText helpers, rebranded PDF exports |
| `src/services/aiService.ts` | Rebranded README template footers |
| `server.mjs` | Rebranded console logs and OpenRouter headers |
| `findings.md` | Logged v4.5 features and mammoth.js dependency |
| `progress.md` | Logged v4.5 progress |

## v5.0 – Complete QA Workflow Pipeline ✅

### New Features Implemented
- ✅ **Sequential Execution Engine** — Chained generators sequentially in a single automated flow (Strategy → Plan → Cases → Playwright POM Automation) with optional parent context injection.
- ✅ **Interactive Timeline Stepper UI** — Created a live timeline showing execution status (Pending, Running, Completed, Failed) and elapsed execution times in seconds for each phase.
- ✅ **Download All ZIP Bundle** — Compiled Strategy, Markdown/Word Plans, Cases CSV, and Playwright framework ZIP into a single master archive `qa-nexus-assets-[JiraID].zip`.
- ✅ **Tabbed Results Sync** — Automatically populate Strategy, Plan, and Cases tabs upon workflow completion so users can review individual items directly.

### Files Modified
| File | Change |
|------|--------|
| `src/services/aiService.ts` | Prompt context chaining (`testStrategy` in plan prompt, `testPlan` in cases prompt) |
| `src/services/exportService.ts` | Upgraded DOCX, CSV, and ZIP download flags, added `exportAllAssetsAsZip` builder |
| `src/components/JiraIDInput.tsx` | Added `workflow` mode, responsive `repeat(auto-fit, minmax(180px, 1fr))` grid styling |
| `src/components/TestStrategyPage.tsx` | Implemented sequential generation loop, status stepper component, and zip handler |
| `src/styles/globals.css` | Added styles for timeline track, bullet nodes, pulsing indicators, and status badges |
| `findings.md` | Logged v5.0 features |
| `progress.md` | Logged v5.0 progress |

