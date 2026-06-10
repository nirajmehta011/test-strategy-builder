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

## Core Features (v2.0)
1. **Persistent Left-Pane Settings** — always visible, collapsible sections
2. **Multi-provider AI** — Groq, OpenRouter, Gemini, OpenAI switchable via provider pills
3. **Live Model Loading** — fetches real model lists from each provider on test
4. **Default Model Lists** — works offline (falls back to curated model lists)
5. **Jira Connection Testing** — validate credentials before generation
6. **AI Connection Testing** — verify API key + fetch live models
7. **Jira Issue Fetch** — auto-pull summary, description, priority, status
8. **Test Strategy Generation** — 10-section QA strategy in markdown
9. **Export Options** — Copy, Markdown download, JSON download
10. **Dark Mode** — default dark, persisted to localStorage

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
