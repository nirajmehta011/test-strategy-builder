import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import jiraService from '../services/jiraService'
import aiService from '../services/aiService'
import { exportAsMarkdown, exportAsJSON, copyToClipboard } from '../services/exportService'
import JiraIDInput from './JiraIDInput'
import StrategyDisplay from './StrategyDisplay'

export default function TestStrategyPage() {
  const { settings } = useSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<string | null>(null)
  const [currentJiraId, setCurrentJiraId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [providerUsed, setProviderUsed] = useState<string>('')

  const getApiKey = () => {
    switch (settings.ai.provider) {
      case 'groq': return settings.ai.groqApiKey
      case 'openrouter': return settings.ai.openRouterApiKey
      case 'gemini': return settings.ai.geminiApiKey
      case 'openai': return settings.ai.openAiApiKey
      default: return ''
    }
  }

  const getModel = () => {
    switch (settings.ai.provider) {
      case 'groq': return settings.ai.selectedModel
      case 'openrouter': return settings.ai.openRouterModel
      case 'gemini': return settings.ai.geminiModel
      case 'openai': return settings.ai.openAiModel
      default: return ''
    }
  }

  const generateStrategy = async (jiraId: string) => {
    setLoading(true)
    setError(null)
    setStrategy(null)
    setCurrentJiraId(jiraId)

    try {
      if (!settings.jira.email || !settings.jira.token || !settings.jira.baseUrl) {
        throw new Error('Please configure your Jira credentials in the left settings panel.')
      }

      const apiKey = getApiKey()
      if (!apiKey) {
        const names: Record<string, string> = {
          groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini', openai: 'OpenAI'
        }
        throw new Error(`Please enter your ${names[settings.ai.provider]} API key in the left settings panel.`)
      }

      // Fetch Jira issue
      jiraService.initialize(settings.jira.email, settings.jira.token, settings.jira.baseUrl)
      const jiraIssue = await jiraService.fetchIssue(jiraId)

      // Generate strategy via selected AI provider
      const testStrategy = await aiService.generateTestStrategy(
        settings.ai.provider,
        apiKey,
        getModel(),
        jiraIssue
      )

      setStrategy(testStrategy)
      setProviderUsed(settings.ai.provider)
    } catch (err: any) {
      setError(err.message || 'Failed to generate test strategy')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!strategy) return
    const success = await copyToClipboard(strategy)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportMarkdown = () => {
    if (strategy && currentJiraId) exportAsMarkdown(strategy, currentJiraId)
  }

  const handleExportJSON = () => {
    if (strategy && currentJiraId) exportAsJSON(strategy, currentJiraId)
  }

  const providerLabels: Record<string, string> = {
    groq: '⚡ Groq', openrouter: '🔀 OpenRouter', gemini: '💎 Gemini', openai: '🤖 OpenAI'
  }

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Generate Test Strategy</h1>
        <p className="page-subtitle">
          Enter a Jira issue ID and let AI craft a comprehensive QA strategy
        </p>
      </div>

      {/* Input */}
      <JiraIDInput onGenerate={generateStrategy} loading={loading} />

      {/* Error */}
      {error && (
        <div className="alert alert-error animate-in">
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-container animate-in">
          <div className="loading-ring" />
          <p className="loading-text">
            Generating strategy with {providerLabels[settings.ai.provider] || settings.ai.provider}
            <span className="loading-dots" />
          </p>
        </div>
      )}

      {/* Strategy Output */}
      {strategy && (
        <div className="animate-in">
          <div className="strategy-card">
            <div className="strategy-card-header">
              <div className="strategy-card-title">
                📋 {currentJiraId} – Test Strategy
                <span className="strategy-card-badge">{providerLabels[providerUsed] || providerUsed}</span>
              </div>
            </div>
            <div className="strategy-content">
              <StrategyDisplay content={strategy} />
            </div>
          </div>

          {/* Export Bar */}
          <div className="export-bar">
            <button className="btn-export" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button className="btn-export" onClick={handleExportMarkdown}>
              📄 Export Markdown
            </button>
            <button className="btn-export" onClick={handleExportJSON}>
              🗂 Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!strategy && !loading && !error && (
        <div className="empty-state animate-in">
          <div className="empty-state-icon">🧪</div>
          <h2 className="empty-state-title">Ready to generate</h2>
          <p className="empty-state-desc">
            Configure your Jira and AI provider in the left panel, then enter a Jira issue ID above to create a detailed test strategy.
          </p>
        </div>
      )}
    </div>
  )
}
