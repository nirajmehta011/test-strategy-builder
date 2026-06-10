import axios from 'axios'

interface GroqModel {
  id: string
  owned_by: string
  object: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class GroqService {
  private apiKey: string = ''

  initialize(apiKey: string) {
    this.apiKey = apiKey
  }

  async getAvailableModels(): Promise<GroqModel[]> {
    if (!this.apiKey) {
      throw new Error('Groq service not initialized. Please configure API key.')
    }

    try {
      const response = await axios.post(`${API_BASE}/groq/models`, {
        apiKey: this.apiKey
      })
      return response.data.models || []
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Groq authentication failed. Check your API key.')
      }
      if (error.response?.status === 403) {
        throw new Error('Groq account is restricted. Contact Groq support.')
      }
      throw new Error(`Failed to fetch Groq models: ${error.response?.data?.error || error.message}`)
    }
  }

  async generateTestStrategy(
    jiraIssue: any,
    selectedModel: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq service not initialized. Please configure API key.')
    }

    const prompt = `You are an expert QA strategist. Based on the following Jira issue, generate a comprehensive test strategy in markdown format.

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

    try {
      const response = await axios.post(`${API_BASE}/groq/complete`, {
        apiKey: this.apiKey,
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      return response.data.response.choices[0].message.content || ''
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Groq authentication failed. Check your API key.')
      }
      if (error.response?.status === 429) {
        throw new Error('Groq rate limited. Try again in a moment.')
      }
      throw new Error(`Failed to generate test strategy: ${error.response?.data?.error || error.message}`)
    }
  }
}

export default new GroqService()
