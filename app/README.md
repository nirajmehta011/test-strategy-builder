# QA Nexus - React SPA Frontend & Proxy Server

This directory contains the codebase for the **QA Nexus** single-page application and its local proxy server.

---

## Features

- **Jira, URL, and Doc Inputs** – Generate QA strategies, plans, and cases from multiple specifications context.
- **Dynamic Connection Loading** – Secure configuration for Groq, OpenRouter, Gemini, and OpenAI APIs.
- **RICE-POT Plan & Test Case Filter** – Render and filter IEEE 829 structured documentation in real-time.
- **POM Automation Engine** – Parse CSV/Excel/PDF test cases client-side and automate them in sequential Playwright TypeScript blocks.

---

## Prerequisites

- Node.js 18+ and npm
- Valid keys for your chosen AI Provider (and optional Jira API credentials)

---

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local environment (Vite frontend + Express backend proxy):**
   ```bash
   npm run dev:full
   ```
   * Frontend: `http://localhost:5173`
   * Backend: `http://localhost:3001`

3. **Configure Settings:**
   - In the app, open the left panel settings.
   - Enter your chosen AI API key and test/load models.
   - Save your settings (they will persist in your browser's LocalStorage securely under the `blast_settings_v2` key).

---

## Production Build

To build the project for production deployment:
```bash
npm run build
```
This generates the optimized static files under `/app/dist/` which are served by Vite.

---

## Project Structure

```
/app
├── api/                  # Vercel serverless function entrypoint
│   └── index.mjs         # Production endpoint wrapping server.mjs
├── public/               # Static icons and assets
├── src/
│   ├── components/       # UI Components (Header, LeftPanel, JiraIDInput, displays, etc.)
│   ├── services/         # API clients (jiraService, aiService, exportService)
│   ├── context/          # State Context (SettingsContext)
│   ├── styles/           # CSS configurations (globals.css)
│   ├── App.tsx           # Entry layout routing
│   └── main.tsx          # DOM root mounting
├── server.mjs            # Express server (runs locally on port 3001, proxies in prod)
└── vercel.json           # Vercel configuration for serverless functions and routing
```
