# QA Nexus Suite

QA Nexus Suite is an advanced, AI-powered QA generation platform that builds premium test assets (Risk-Based Test Strategies, RICE-POT IEEE 829 Test Plans, and Jira/Zephyr-compatible Test Cases) from multiple input contexts and automatically produces modular Page Object Model (POM) Playwright TypeScript test automation suites.

---

## Key Features

### 1. Multi-Input Spec Context
Generate comprehensive QA documentation from:
* 🎫 **Jira Ticket ID** – Fetches and sanitizes Jira issue descriptions automatically.
* 🌐 **Website URL** – Scrapes webpage content dynamically via backend proxy and filters readable text specifications.
* 📄 **Specification Document** – Upload specifications (`.txt`, `.md`, `.pdf`, `.docx`, `.doc`) parsed entirely on the client side (using PDF.js and Mammoth.js).

### 2. Output Generation Modules
* 🎯 **Test Strategy** – Generates a 10-section risk-based QA strategy (Markdown/JSON exports).
* 📋 **Test Plan** – Generates a complete RICE-POT IEEE 829 test plan with structured section styles (PDF + DOCX exports).
* 🧪 **Test Cases** – Generates structured Jira/Zephyr test cases with incremental sequential expansion ("Add More Cases") and interactive custom scenarios if all standard paths are covered (CSV export for Jira Bulk Import).

### 3. Playwright TS POM Automation ("Automate Any Cases")
* Parse CSV, Excel, or PDF test case files client-side.
* Automatically generate a production-ready Playwright TypeScript automation framework following modular **Page Object Model (POM)** standards:
  * Global setup (`tests/auth.setup.ts`) for authenticated states.
  * Base page object class (`pages/base.page.ts`) containing reusable actions.
  * Page classes encapsulating locators.
  * Clean spec files importing page objects.
* **Sequential Batch Automation**: Code generation is batched in sizes of 5 to guarantee 100% complete executable code without placeholders and bypass Vercel serverless function execution timeouts.
* **Export**: Ready-to-run ZIP bundle containing the framework directory structure.

### 4. Multi-Provider AI Engine
* Switch between **Groq**, **OpenRouter**, **Gemini**, and **OpenAI**.
* Persistent sidebar settings with per-provider API key vaults.
* Live model list loading and connection checks.

---

## Architecture Overview

QA Nexus is built as a lightweight, glassmorphic single-page application (React 18 + TypeScript + CSS Variables) coupled with an Express backend proxy (`server.mjs`) deployed as a Vercel Serverless Function to securely bypass CORS blocks.

```
├── app/
│   ├── api/index.mjs     # Vercel Serverless entrypoint
│   ├── src/
│   │   ├── components/   # React components (Header, LeftPanel, TestStrategyPage, JiraIDInput, etc.)
│   │   ├── services/     # API clients & parser utilities (aiService.ts, exportService.ts, jiraService.ts)
│   │   └── context/      # State management context (SettingsContext.tsx)
│   ├── public/           # Static assets
│   ├── package.json      # Node dependencies (jspdf, docx, jszip, mammoth, etc.)
│   └── server.mjs        # Local Express server proxy
├── findings.md           # Research, discoveries, and versions
├── gemini.md             # Project Constitution & Maintenance Log
├── progress.md           # Implementation progress log
└── B.L.A.S.T.md          # RICE-POT standards and QA guidelines
```

---

## Setup & Running Locally

### Prerequisites
* Node.js 18+ and npm installed.
* API credentials for Jira Cloud (optional) and your preferred AI provider (Groq, OpenRouter, Gemini, or OpenAI).

### Step 1: Install Dependencies
```bash
cd app
npm install
```

### Step 2: Start Development Servers
Run both the frontend Vite dev server (port 5173) and the backend Express proxy (port 3001) concurrently:
```bash
npm run dev:full
```

### Step 3: Configure settings in UI
1. Navigate to the left panel settings in the browser.
2. Choose your preferred AI provider, insert your API key, and load/select the model.
3. Configure Jira credentials (optional) to fetch tickets directly.

---

## Production Deployment (Vercel)
The project is optimized to run as a zero-CORS serverless project:
1. Connect this repository to your Vercel Dashboard.
2. Set the **Root Directory** as `app`.
3. Vercel will automatically build the static bundle and deploy the API routes defined in `vercel.json` and `api/`.
