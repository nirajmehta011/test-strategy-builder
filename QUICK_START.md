# Quick Start Guide

## 🚀 Get Running in 2 Minutes

### Step 1: Open Two Terminals

**Terminal 1 - Start Backend:**
```bash
cd "/Users/nirajmehta/Documents/AI Projects/BLAST FW/app"
npm run server
```

**Terminal 2 - Start Frontend:**
```bash
cd "/Users/nirajmehta/Documents/AI Projects/BLAST FW/app"
npm run dev
```

### Step 2: Open Browser
Navigate to: http://localhost:5173/

### Step 3: Test the Application

#### Test Jira Connection
1. Click "Settings"
2. Jira credentials are pre-filled from .env
3. Click "Test Connection" under Jira Configuration
4. Expected: ✅ "Jira connection successful! (User: niraj mehta)"

#### Test Groq Connection  
1. Click "Settings"
2. Enter your Groq API key (get one at https://console.groq.com/keys)
3. Click "Test Connection & Load Models"
4. Expected: ❌ "Groq account is restricted - contact Groq support"
   - This is expected (account-level issue with Groq)

#### Generate Test Strategy
1. Click "Generate Strategy"
2. Enter a Jira issue ID (e.g., PROJ-123)
3. Click "Generate"
4. Wait for result or error message

---

## ✅ What's Already Configured

Configure your Jira credentials in the left settings panel or in `.env`:
- **Email**: your-email@company.com
- **Token**: your-jira-api-token (get one at https://id.atlassian.com/manage-profile/security/api-tokens)
- **URL**: https://your-org.atlassian.net

---

## 🎨 UI Features

### Dark/Light Mode
- Click moon icon (🌙) in top-right
- Persists across page refreshes

### Settings Page
- Email, token, URL for Jira
- API key for Groq  
- Model selection dropdown (when models load)
- Auto-save option

### Test Strategy Page
- Enter Jira issue ID
- Click Generate
- See markdown strategy output
- Export options: Copy, Markdown, JSON

---

## ⚠️ Known Issues

### Groq API Restriction
The provided Groq API key has an account restriction:
- Error: `403 Forbidden - organization_restricted`
- Solution: Use a different Groq API key or contact support

### No Test Issues in Jira
The Jira instance doesn't have any issues to test with:
- You need to create issues first
- Log in to: https://nikstest.atlassian.net
- Create a project and add issues
- Then use issue IDs in the app (e.g., PROJ-1)

---

## 🔧 Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS 3.3.6 |
| Backend | Node.js/Express 4.18.2 |
| HTTP | Axios 1.6.0 |
| API Integration | Jira Cloud + Groq |

---

## 📱 Responsive Design

The app works on:
- ✅ Desktop (1920x1080+)
- ✅ Tablet (768px+)
- ✅ Mobile (375px+)

---

## 🆘 Need Help?

**Backend won't start:**
```bash
# Check if port 3001 is in use
lsof -i :3001
# Kill the process if needed
lsof -ti:3001 | xargs kill -9
```

**Frontend won't start:**
```bash
# Check if port 5173 is in use
lsof -i :5173
# Kill the process if needed
lsof -ti:5173 | xargs kill -9
```

**Check backend is responding:**
```bash
curl http://localhost:3001/health
```

---

## 📚 Next Steps

1. **Create Jira Issues** in your Jira instance
2. **Test Strategy Generation** with real issues
3. **Verify Groq API** or use alternative key
4. **Export Strategies** in your preferred format

Enjoy! 🎉
