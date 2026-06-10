import axios from 'axios'
import { AIProvider } from '../context/SettingsContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AIModel {
  id: string
  name: string
}

export const GROQ_DEFAULT_MODELS: AIModel[] = [
  { id: 'llama3-70b-8192', name: 'LLaMA 3 70B (8192)' },
  { id: 'llama3-8b-8192', name: 'LLaMA 3 8B (8192)' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32768)' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
  { id: 'llama-3.1-70b-versatile', name: 'LLaMA 3.1 70B Versatile' },
  { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile' },
]

export const OPENROUTER_DEFAULT_MODELS: AIModel[] = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'LLaMA 3.1 70B Instruct' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
]

export const GEMINI_DEFAULT_MODELS: AIModel[] = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
]

export const OPENAI_DEFAULT_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]

const buildTestStrategyPrompt = (jiraIssue: any) => `You are an expert QA strategist. Based on the following Jira issue, generate a comprehensive test strategy in markdown format.

Issue Key: ${jiraIssue.key}
Summary: ${jiraIssue.summary}
Description: ${jiraIssue.description}
Priority: ${jiraIssue.priority}
Status: ${jiraIssue.status}

Generate a detailed test strategy with the following sections (use markdown headers):

1. Test Types - List all applicable test types (unit, integration, e2e, performance, security, etc.)
2. Scope - Define what will and won't be tested
3. Focus Areas - Highlight critical paths and edge cases
4. Approach - Describe the testing methodology and strategy
5. Risks - Identify potential risks and mitigation strategies
6. Entry Criteria - Define prerequisites for testing
7. Exit Criteria - Define completion criteria
8. Environments - Specify testing environments (dev, staging, prod)
9. Deliverables - List artifacts to be produced
10. Traceability - Explain how test cases map to requirements

Format the response as valid markdown with clear section headers.`

class AIService {
  async fetchModels(provider: AIProvider, apiKey: string): Promise<AIModel[]> {
    try {
      const response = await axios.post(`${API_BASE}/${provider}/models`, { apiKey })
      return response.data.models || []
    } catch {
      // Return defaults on failure
      return this.getDefaultModels(provider)
    }
  }

  getDefaultModels(provider: AIProvider): AIModel[] {
    switch (provider) {
      case 'groq': return GROQ_DEFAULT_MODELS
      case 'openrouter': return OPENROUTER_DEFAULT_MODELS
      case 'gemini': return GEMINI_DEFAULT_MODELS
      case 'openai': return OPENAI_DEFAULT_MODELS
      default: return []
    }
  }

  async testConnection(provider: AIProvider, apiKey: string): Promise<{ success: boolean; message: string; models?: AIModel[] }> {
    try {
      const response = await axios.post(`${API_BASE}/${provider}/models`, { apiKey }, { timeout: 10000 })
      const models: AIModel[] = response.data.models || []
      return {
        success: true,
        message: `✅ Connected! ${models.length > 0 ? `${models.length} models available` : 'Connection verified'}`,
        models
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Connection failed'
      if (error.message?.includes('Failed to fetch') || error.code === 'ECONNREFUSED') {
        return { success: false, message: '❌ Cannot reach backend server (port 3001). Is it running?' }
      }
      if (error.response?.status === 401) {
        return { success: false, message: `❌ Invalid API key for ${provider}` }
      }
      return { success: false, message: `❌ ${msg}` }
    }
  }

  async generateTestStrategy(
    provider: AIProvider,
    apiKey: string,
    model: string,
    jiraIssue: any
  ): Promise<string> {
    if (!apiKey) {
      throw new Error(`Please configure your ${provider} API key in the settings panel.`)
    }
    if (!model) {
      throw new Error('Please select a model in the settings panel.')
    }

    const prompt = buildTestStrategyPrompt(jiraIssue)

    try {
      const response = await axios.post(`${API_BASE}/${provider}/complete`, {
        apiKey,
        model,
        messages: [{ role: 'user', content: prompt }]
      }, { timeout: 60000 })

      return response.data.content || response.data.response?.choices?.[0]?.message?.content || ''
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error(`Authentication failed for ${provider}. Check your API key.`)
      }
      if (error.response?.status === 429) {
        throw new Error(`Rate limited by ${provider}. Please try again in a moment.`)
      }
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate test strategy')
    }
  }
}

export default new AIService()
