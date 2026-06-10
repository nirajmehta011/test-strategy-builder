# Task Plan

## Goal
Build a lightweight React application that:
- Stores Jira and Groq API credentials in settings (via LocalStorage)
- Accepts a Jira ID from the user
- Fetches Jira issue details automatically via Jira Cloud API
- Generates a comprehensive test strategy using Groq API
- Displays the strategy in the UI with Light/Dark mode support
- Allows download as markdown or JSON

## Phase 1: Blueprint ✅
- Discovered requirements and confirmed React SPA architecture.
- Defined data schema for settings, Jira responses, and test strategy output.
- Verified .env file with required credentials.

## Phase 2: Link ✅
- ✅ Created API verification scripts (verify_env.py, verify_jira.py, verify_groq.py)
- ✅ Verified Jira API connectivity (nikstest.atlassian.net)
- ⚠️ Groq API requires account fix (organization restricted)

## Phase 3: Architect ✅
- ✅ Designed 3-layer architecture (Architecture SOPs, Navigation, Tools)
- ✅ Created comprehensive documentation (PHASE_3_ARCHITECT.md)
- ✅ Defined React component structure
- ✅ Planned API service utilities

## Phase 4: Stylize ✅
- ✅ Built React SPA with Vite + TypeScript
- ✅ Implemented all UI components
- ✅ Applied TailwindCSS with dark mode
- ✅ Created service utilities (jiraService, groqService, exportService)
- ✅ Implemented settings management with Context API

## Phase 5: Trigger (Current)
- [ ] Create deployment documentation
- [ ] Set up production build configuration
- [ ] Test full workflow end-to-end
- [ ] Prepare deployment guide

## Installation & Running

### Step 1: Install Dependencies
```bash
cd app
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```
This will open the app at `http://localhost:5173`

### Step 3: Configure Settings
1. Go to Settings page
2. Enter Jira email, API token, and base URL
3. Enter Groq API key
4. Click "Test Connection" for both Jira and Groq

### Step 4: Generate Test Strategy
1. Go to "Generate Strategy" page
2. Enter a Jira ID (e.g., SCRUM-6)
3. Click "Generate"
4. View the strategy and export as markdown or JSON

## Build for Production
```bash
npm run build
```
Output will be in `/app/dist/`
