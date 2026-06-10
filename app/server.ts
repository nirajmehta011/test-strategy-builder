import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.BACKEND_PORT || 3001

app.use(cors())
app.use(express.json())

// Proxy Jira API requests
app.post('/api/jira/test', async (req, res) => {
  try {
    const { email, token, baseUrl } = req.body

    if (!email || !token || !baseUrl) {
      return res.status(400).json({ error: 'Missing Jira credentials' })
    }

    const auth = Buffer.from(`${email}:${token}`).toString('base64')
    
    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    res.json({ success: true, user: response.data })
  } catch (error: any) {
    console.error('Jira proxy error:', error.message)
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Jira authentication failed - check email/token' })
    } else if (error.response?.status === 404) {
      res.status(404).json({ error: 'Jira URL not found - check base URL' })
    } else if (error.message === 'getaddrinfo ENOTFOUND') {
      res.status(400).json({ error: 'Invalid Jira URL' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Proxy Jira issue fetch
app.post('/api/jira/issue', async (req, res) => {
  try {
    const { email, token, baseUrl, issueKey } = req.body

    if (!email || !token || !baseUrl || !issueKey) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const auth = Buffer.from(`${email}:${token}`).toString('base64')
    
    const response = await axios.get(`${baseUrl}/rest/api/3/issues/${issueKey}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    res.json({ success: true, issue: response.data })
  } catch (error: any) {
    console.error('Jira issue fetch error:', error.message)
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Jira authentication failed' })
    } else if (error.response?.status === 404) {
      res.status(404).json({ error: 'Issue not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Proxy Groq API requests
app.post('/api/groq/models', async (req, res) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing Groq API key' })
    }

    const response = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })

    res.json({ success: true, models: response.data.data })
  } catch (error: any) {
    console.error('Groq models error:', error.message)
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Groq authentication failed - check API key' })
    } else if (error.response?.data?.error?.message?.includes('restricted')) {
      res.status(403).json({ error: 'Groq account is restricted - contact Groq support' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Proxy Groq completion requests
app.post('/api/groq/complete', async (req, res) => {
  try {
    const { apiKey, model, messages } = req.body

    if (!apiKey || !model || !messages) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    res.json({ success: true, response: response.data })
  } catch (error: any) {
    console.error('Groq completion error:', error.message)
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Groq authentication failed' })
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'Groq rate limited - try again later' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Backend proxy server running on http://localhost:${PORT}`)
})
