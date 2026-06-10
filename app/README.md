# Test Strategy Builder - React SPA

A lightweight React application for generating comprehensive test strategies using Jira and Groq AI.

## Features

- **Jira Integration** – Fetch issue details automatically
- **Groq AI** – Generate intelligent test strategies
- **Model Selection** – Choose from available Groq models
- **Dark Mode** – Light and dark theme support
- **Export Options** – Download as markdown or JSON
- **Settings Management** – Secure credential storage (LocalStorage)

## Prerequisites

- Node.js 18+ and npm
- Jira Cloud account with API token
- Groq API key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   - Go to Settings page
   - Enter Jira email, API token, and base URL
   - Enter Groq API key
   - Test connections

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
/app
├── src/
│   ├── components/       # React components
│   ├── services/         # API clients & utilities
│   ├── context/          # State management
│   ├── styles/           # CSS & Tailwind
│   ├── App.tsx
│   └── main.tsx
├── public/               # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Architecture

### 3-Layer Design

1. **Layer 1: Architecture** – Deterministic SOPs in markdown
2. **Layer 2: Navigation** – React components and routing
3. **Layer 3: Tools** – API services and utilities

## How It Works

1. **Enter Jira ID** (e.g., SCRUM-6)
2. **Fetch Issue** from Jira Cloud API
3. **Generate Strategy** using Groq AI based on issue details
4. **View & Export** as markdown or JSON

## Technologies

- **Frontend:** React 18, TypeScript, TailwindCSS
- **Build:** Vite
- **APIs:** Jira Cloud API, Groq API
- **State:** Context API
- **HTTP:** Axios

## Environment Variables

Create a `.env` file (or use `.env.example` as template):

```
GROQ_KEY=gsk_***
JIRA_EMAIL=your.email@example.com
JIRA_TOKEN=APAT***
JIRA_URL=https://your-domain.atlassian.net
```

## Testing

- Use Settings page to test Jira and Groq connections
- Models dropdown will populate if Groq connection is successful
- Error messages provide detailed troubleshooting information

## Security

- Sensitive data stored in LocalStorage (browser-only, not transmitted)
- Jira tokens use Basic Auth encryption
- Groq API key transmitted securely over HTTPS
- PII sanitized from Jira descriptions (emails, phone numbers)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Jira auth fails | Verify email, token, and base URL |
| Groq models won't load | Check API key and organization status |
| Strategy incomplete | Review Groq API status and retry |

## Support

For detailed architecture documentation, see:
- `/architecture/PHASE_2_LINK.md` – API verification
- `/architecture/PHASE_3_ARCHITECT.md` – 3-layer design
