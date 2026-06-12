import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.BACKEND_PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}))
app.use(express.json())

// ─────────────────────────────── HEALTH ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'Backend proxy server running', version: '2.0.0' })
})

// ─────────────────────────────── FETCH URL ───────────────────────────────────
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'Missing URL parameter' })
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 15000
    })
    res.json({ success: true, html: response.data })
  } catch (error) {
    const msg = error.response?.data || error.message || 'Failed to fetch website URL'
    res.status(500).json({ error: msg })
  }
})

// ─────────────────────────────── JIRA ────────────────────────────────────────
app.post('/api/jira/test', async (req, res) => {
  try {
    const { email, token, baseUrl } = req.body
    if (!email || !token || !baseUrl) return res.status(400).json({ error: 'Missing Jira credentials' })

    const auth = Buffer.from(`${email}:${token}`).toString('base64')
    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      timeout: 10000
    })
    res.json({ success: true, user: response.data })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'Jira authentication failed – check email/token' })
    if (e.response?.status === 404) return res.status(404).json({ error: 'Jira URL not found – check base URL' })
    if (e.code === 'ENOTFOUND') return res.status(400).json({ error: 'Invalid Jira URL – host not found' })
    res.status(500).json({ error: e.message || 'Unknown error' })
  }
})

app.post('/api/jira/issue', async (req, res) => {
  try {
    const { email, token, baseUrl, issueKey } = req.body
    if (!email || !token || !baseUrl || !issueKey) return res.status(400).json({ error: 'Missing required parameters' })

    const auth = Buffer.from(`${email}:${token}`).toString('base64')
    // Fix: correct Jira API path is /rest/api/3/issue/ (not /issues/)
    const response = await axios.get(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      timeout: 10000
    })
    res.json({ success: true, issue: response.data })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'Jira authentication failed' })
    if (e.response?.status === 404) return res.status(404).json({ error: `Issue not found. Check the Issue Key.` })
    res.status(500).json({ error: e.message || 'Unknown error' })
  }
})

// ─────────────────────────────── GROQ ────────────────────────────────────────
app.post('/api/groq/models', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

    const response = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      timeout: 10000
    })
    const models = (response.data.data || []).map(m => ({ id: m.id, name: m.id }))
    res.json({ success: true, models })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'Groq authentication failed – check API key' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

app.post('/api/groq/complete', async (req, res) => {
  try {
    const { apiKey, model, messages } = req.body
    if (!apiKey || !model || !messages) return res.status(400).json({ error: 'Missing required parameters' })

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions',
      { model, messages, temperature: 0.7, max_tokens: 4000 },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    )
    res.json({ success: true, content: response.data.choices[0].message.content })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'Groq authentication failed' })
    if (e.response?.status === 429) return res.status(429).json({ error: 'Groq rate limited – try again later' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

// ─────────────────────────────── OPENROUTER ──────────────────────────────────
app.post('/api/openrouter/models', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      timeout: 10000
    })
    const models = (response.data.data || [])
      .slice(0, 50) // limit to top 50
      .map(m => ({ id: m.id, name: m.name || m.id }))
    res.json({ success: true, models })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'OpenRouter authentication failed – check API key' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

app.post('/api/openrouter/complete', async (req, res) => {
  try {
    const { apiKey, model, messages } = req.body
    if (!apiKey || !model || !messages) return res.status(400).json({ error: 'Missing required parameters' })

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions',
      { model, messages, temperature: 0.7, max_tokens: 4000 },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'QA Nexus'
        },
        timeout: 60000
      }
    )
    res.json({ success: true, content: response.data.choices[0].message.content })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'OpenRouter authentication failed' })
    if (e.response?.status === 429) return res.status(429).json({ error: 'OpenRouter rate limited – try again later' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

// ─────────────────────────────── GEMINI ──────────────────────────────────────
app.post('/api/gemini/models', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 10000 }
    )
    const models = (response.data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name }))
    res.json({ success: true, models })
  } catch (error) {
    const e = error
    if (e.response?.status === 400 || e.response?.status === 403) {
      return res.status(401).json({ error: 'Gemini authentication failed – check API key' })
    }
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

app.post('/api/gemini/complete', async (req, res) => {
  try {
    const { apiKey, model, messages } = req.body
    if (!apiKey || !model || !messages) return res.status(400).json({ error: 'Missing required parameters' })

    const userMessage = messages.find(m => m.role === 'user')?.content || ''
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
      },
      { timeout: 60000 }
    )
    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.json({ success: true, content })
  } catch (error) {
    const e = error
    if (e.response?.status === 400 || e.response?.status === 403) {
      return res.status(401).json({ error: 'Gemini authentication failed' })
    }
    if (e.response?.status === 429) return res.status(429).json({ error: 'Gemini rate limited – try again later' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

// ─────────────────────────────── OPENAI ──────────────────────────────────────
app.post('/api/openai/models', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      timeout: 10000
    })
    const models = (response.data.data || [])
      .filter(m => m.id.startsWith('gpt'))
      .sort((a, b) => b.created - a.created)
      .slice(0, 20)
      .map(m => ({ id: m.id, name: m.id }))
    res.json({ success: true, models })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'OpenAI authentication failed – check API key' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

app.post('/api/openai/complete', async (req, res) => {
  try {
    const { apiKey, model, messages } = req.body
    if (!apiKey || !model || !messages) return res.status(400).json({ error: 'Missing required parameters' })

    const response = await axios.post('https://api.openai.com/v1/chat/completions',
      { model, messages, temperature: 0.7, max_tokens: 4000 },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    )
    res.json({ success: true, content: response.data.choices[0].message.content })
  } catch (error) {
    const e = error
    if (e.response?.status === 401) return res.status(401).json({ error: 'OpenAI authentication failed' })
    if (e.response?.status === 429) return res.status(429).json({ error: 'OpenAI rate limited – try again later' })
    res.status(500).json({ error: e.response?.data?.error?.message || e.message || 'Unknown error' })
  }
})

// ─────────────────────────────── ERROR HANDLER ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 QA Nexus Backend proxy server running on http://localhost:${PORT}`)
    console.log(`📍 Frontend should be running on http://localhost:5173`)
    console.log(`✅ Providers supported: Groq | OpenRouter | Gemini | OpenAI\n`)
  })
}

export default app
