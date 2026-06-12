# Project Constitution - QA Nexus Framework

## Project Overview
**Name:** QA Nexus Suite (Multi-Input QA Asset Generator)  
**Methodology:** B.L.A.S.T. (Blueprint → Link → Architect → Stylize → Trigger)  
**Status:** Phase 5 (Trigger) - Production-Ready  
**Start Date:** 2026-06-10  

## Architecture Overview
- **Frontend:** React 18 SPA with TypeScript, Vite, TailwindCSS
- **Integrations:** Jira Cloud API, Website URL Scraper Proxy, Spec Document parsing (Mammoth.js, PDF.js), Groq/OpenRouter/Gemini/OpenAI APIs
- **Data Storage:** LocalStorage (browser-side)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, CSS custom properties |
| State | Context API |
| HTTP | Axios |
| Markdown | react-markdown |

## 3-Layer Architecture

### Layer 1: Architecture (SOPs in Markdown)
- `/architecture/PHASE_2_LINK.md` – API verification
- `/architecture/PHASE_3_ARCHITECT.md` – 3-layer design & SOPs
- `/architecture/PHASE_5_TRIGGER.md` – Deployment guide

### Layer 2: Navigation (React Components)
- `App.tsx` – Root component
- `Header.tsx` – Navigation and theme toggle
- `SettingsPage.tsx` – Configuration
- `TestStrategyPage.tsx` – Main workflow
- `SettingsContext.tsx` – State management

### Layer 3: Tools (Services)
- `jiraService.ts` – Jira API client
- `groqService.ts` – Groq API client
- `exportService.ts` – Export utilities

## Behavioral Rules

### Core Behavior
- Lightweight and performant React app
- Light/Dark mode toggle
- Settings stored in LocalStorage

### Jira Integration
- Support all accessible projects
- Validate ID format (e.g., SCRUM-6)
- Sanitize PII from descriptions
- Basic Auth for API calls

### Groq Integration
- Dynamic model selection dropdown
- Support all available models
- Retry logic for failures
- Generate strategies from Jira issues

### Data & Security
- No PII in output
- API credentials in LocalStorage (browser-only)
- Basic Auth (Jira) and Bearer Token (Groq)

## Key Features

✅ Settings Management – Save Jira/Groq credentials
✅ Jira Integration – Auto-fetch issue details
✅ Groq AI – Intelligent test strategy generation
✅ Model Selection – Dynamic dropdown with available models
✅ Dark Mode – Light/dark theme support
✅ Export Options – Copy, markdown, JSON download
✅ Connection Testing – Verify APIs in settings
✅ Error Handling – User-friendly messages
✅ PII Sanitization – Remove sensitive data
✅ Responsive Design – Mobile-friendly UI

## Maintenance Log

| Date | Event | Status |
|------|-------|--------|
| 2026-06-10 | Phases 0-4 completed | ✅ |
| 2026-06-10 | Phase 5 documentation & deployment | ✅ |
| 2026-06-11 | Playwright POM integration & chunked sequential automation | ✅ |
| 2026-06-12 | Rebrand to QA Nexus, multi-input context support (URL, Doc) & Mammoth.js integration | ✅ |

**Last Updated:** 2026-06-12  
**Version:** 2.5.0 (Vercel Production)
