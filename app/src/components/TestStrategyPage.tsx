import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import jiraService from '../services/jiraService'
import aiService from '../services/aiService'
import type { TestCase } from '../services/aiService'
import { exportAsMarkdown, exportAsJSON, copyToClipboard } from '../services/exportService'
import JiraIDInput from './JiraIDInput'
import type { GenerationMode } from './JiraIDInput'
import StrategyDisplay from './StrategyDisplay'
import TestPlanDisplay from './TestPlanDisplay'
import TestCasesDisplay from './TestCasesDisplay'

const providerLabels: Record<string, string> = {
  groq: '⚡ Groq', openrouter: '🔀 OpenRouter', gemini: '💎 Gemini', openai: '🤖 OpenAI'
}

export default function TestStrategyPage() {
  const { settings } = useSettings()

  const [activeMode, setActiveMode] = useState<GenerationMode>('strategy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentJiraId, setCurrentJiraId] = useState('')
  const [providerUsed, setProviderUsed] = useState('')

  // Per-mode outputs
  const [strategy, setStrategy] = useState<string | null>(null)
  const [testPlan, setTestPlan] = useState<string | null>(null)
  const [testCases, setTestCases] = useState<TestCase[] | null>(null)
  const [jiraIssue, setJiraIssue] = useState<any | null>(null)
  const [isAddingCases, setIsAddingCases] = useState(false)
  const [isAutomating, setIsAutomating] = useState(false)
  const [playwrightData, setPlaywrightData] = useState<any | null>(null)
  const [noMoreCases, setNoMoreCases] = useState(false)
  const [isAddingCustomCase, setIsAddingCustomCase] = useState(false)



  // View tab for generated results (independent of mode)
  const [viewTab, setViewTab] = useState<GenerationMode>('strategy')

  // Copy state for strategy
  const [copied, setCopied] = useState(false)

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

  const generate = async (jiraId: string, mode: GenerationMode) => {
    setLoading(true)
    setError(null)
    setCurrentJiraId(jiraId)
    setActiveMode(mode)

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

      jiraService.initialize(settings.jira.email, settings.jira.token, settings.jira.baseUrl)
      const fetchedIssue = await jiraService.fetchIssue(jiraId)
      setJiraIssue(fetchedIssue)
      setPlaywrightData(null) // reset playwright data on new ticket / regeneration
      setNoMoreCases(false) // reset noMoreCases state

      const prov = settings.ai.provider
      const model = getModel()
 
      if (mode === 'strategy') {
        const result = await aiService.generateTestStrategy(prov, apiKey, model, fetchedIssue)
        setStrategy(result)
        setViewTab('strategy')
      } else if (mode === 'plan') {
        const result = await aiService.generateTestPlan(prov, apiKey, model, fetchedIssue)
        setTestPlan(result)
        setViewTab('plan')
      } else if (mode === 'cases') {
        const result = await aiService.generateTestCases(prov, apiKey, model, fetchedIssue)
        setTestCases(result)
        setViewTab('cases')
      }
 
      setProviderUsed(prov)
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addMoreTestCases = async () => {
    if (!jiraIssue || !testCases) return
    setIsAddingCases(true)
    setError(null)
    try {
      const apiKey = getApiKey()
      const prov = settings.ai.provider
      const model = getModel()
      const response = await aiService.generateMoreTestCases(prov, apiKey, model, jiraIssue, testCases)
      
      if (response.noMoreCases) {
        setNoMoreCases(true)
      } else {
        setTestCases([...testCases, ...response.testCases])
        setNoMoreCases(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate more test cases. Please try again.')
    } finally {
      setIsAddingCases(false)
    }
  }

  const addCustomTestCase = async (customScenario: string) => {
    if (!jiraIssue || !testCases) return
    setIsAddingCustomCase(true)
    setError(null)
    try {
      const apiKey = getApiKey()
      const prov = settings.ai.provider
      const model = getModel()
      const customCase = await aiService.generateCustomTestCase(prov, apiKey, model, jiraIssue, testCases, customScenario)
      setTestCases([...testCases, customCase])
      setNoMoreCases(false) // Reset "no more cases" since a custom one was added
    } catch (err: any) {
      setError(err.message || 'Failed to generate custom testcase. Please try again.')
    } finally {
      setIsAddingCustomCase(false)
    }
  }

  const automateTestCases = async () => {
    if (!jiraIssue || !testCases) return
    setIsAutomating(true)
    setError(null)
    try {
      const apiKey = getApiKey()
      const prov = settings.ai.provider
      const model = getModel()
      const data = await aiService.generatePlaywrightTests(prov, apiKey, model, jiraIssue, testCases)
      setPlaywrightData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to automate test cases. Please try again.')
    } finally {
      setIsAutomating(false)
    }
  }

  const handleAutomateFile = async (fileData: { cases?: TestCase[], pdfText?: string }, fileName: string) => {
    setLoading(true)
    setError(null)
    setCurrentJiraId(`File: ${fileName}`)
    setActiveMode('cases')
    setStrategy(null)
    setTestPlan(null)
    setNoMoreCases(false)
    setPlaywrightData(null)

    // Set a mock JIRA issue so that AI prompts can still run with standard context
    const mockIssue = {
      key: 'FILE',
      summary: `Imported Suite: ${fileName}`,
      description: `Test cases imported directly from file ${fileName}.`,
      priority: 'Medium',
      status: 'Open',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }

    setJiraIssue(mockIssue)

    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        const names: Record<string, string> = {
          groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini', openai: 'OpenAI'
        }
        throw new Error(`Please enter your ${names[settings.ai.provider]} API key in the left settings panel.`)
      }

      const prov = settings.ai.provider
      const model = getModel()

      let finalCases: TestCase[] = []

      if (fileData.cases) {
        finalCases = fileData.cases
      } else if (fileData.pdfText) {
        // AI call to parse/extract test cases from raw PDF text
        finalCases = await aiService.extractTestCasesFromText(prov, apiKey, model, fileData.pdfText)
      }

      if (finalCases.length === 0) {
        throw new Error('No valid test cases could be parsed or extracted from the file.')
      }

      setTestCases(finalCases)
      setViewTab('cases')

      // Call automation directly
      const data = await aiService.generatePlaywrightTests(prov, apiKey, model, mockIssue, finalCases)
      setPlaywrightData(data)
      setProviderUsed(prov)
    } catch (err: any) {
      setError(err.message || 'Automation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasAnyOutput = strategy || testPlan || testCases

  const handleCopy = async () => {
    if (!strategy) return
    const ok = await copyToClipboard(strategy)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const loadingMessages: Record<GenerationMode, string> = {
    strategy: 'Crafting risk-based test strategy',
    plan: 'Building RICE-POT test plan (this may take ~60s)',
    cases: 'Generating detailed test cases (this may take ~60s)',
    automate_csv: 'Parsing and automating test cases from file (this may take ~90s)'
  }

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">BLAST QA Generator</h1>
        <p className="page-subtitle">
          Generate comprehensive Test Strategies, RICE-POT Test Plans, and Jira/Zephyr Test Cases from any Jira ticket
        </p>
      </div>

      {/* Input */}
      <JiraIDInput onGenerate={generate} onAutomateFile={handleAutomateFile} loading={loading} activeMode={activeMode} />

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
            {loadingMessages[activeMode]} with {providerLabels[settings.ai.provider] || settings.ai.provider}
            <span className="loading-dots" />
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Larger issues may take up to 90 seconds for comprehensive output
          </p>
        </div>
      )}

      {/* Output Tabs — only shown when at least one output exists */}
      {hasAnyOutput && !loading && (
        <>
          <div className="output-tabs">
            {strategy && (
              <button
                className={`output-tab ${viewTab === 'strategy' ? 'active' : ''}`}
                onClick={() => setViewTab('strategy')}
              >
                🎯 Test Strategy
              </button>
            )}
            {testPlan && (
              <button
                className={`output-tab output-tab-purple ${viewTab === 'plan' ? 'active' : ''}`}
                onClick={() => setViewTab('plan')}
              >
                📋 Test Plan
              </button>
            )}
            {testCases && (
              <button
                className={`output-tab output-tab-cyan ${viewTab === 'cases' ? 'active' : ''}`}
                onClick={() => setViewTab('cases')}
              >
                🧪 Test Cases
                <span className="output-tab-count">{testCases.length}</span>
              </button>
            )}
            <div className="output-tabs-jira-id">{currentJiraId}</div>
          </div>

          {/* Strategy View */}
          {viewTab === 'strategy' && strategy && (
            <div className="animate-in">
              <div className="strategy-card">
                <div className="strategy-card-header">
                  <div className="strategy-card-title">
                    🎯 {currentJiraId} – Test Strategy
                    <span className="strategy-card-badge">{providerLabels[providerUsed] || providerUsed}</span>
                  </div>
                </div>
                <div className="strategy-content">
                  <StrategyDisplay content={strategy} />
                </div>
              </div>
              <div className="export-bar">
                <button className="btn-export" onClick={handleCopy}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
                <button className="btn-export" onClick={() => exportAsMarkdown(strategy, currentJiraId, 'strategy')}>📄 Markdown</button>
                <button className="btn-export" onClick={() => exportAsJSON(strategy, currentJiraId)}>🗂 JSON</button>
              </div>
            </div>
          )}

          {/* Test Plan View */}
          {viewTab === 'plan' && testPlan && (
            <TestPlanDisplay content={testPlan} jiraId={currentJiraId} provider={providerUsed} />
          )}

          {/* Test Cases View */}
          {viewTab === 'cases' && testCases && (
            <TestCasesDisplay
              testCases={testCases}
              jiraId={currentJiraId}
              provider={providerUsed}
              onAddMoreCases={addMoreTestCases}
              isAddingCases={isAddingCases}
              onAutomateCases={automateTestCases}
              isAutomating={isAutomating}
              playwrightData={playwrightData}
              onAddCustomCase={addCustomTestCase}
              isAddingCustomCase={isAddingCustomCase}
              noMoreCases={noMoreCases}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!hasAnyOutput && !loading && !error && (
        <div className="empty-state animate-in">
          <div className="empty-state-icon">🧪</div>
          <h2 className="empty-state-title">Ready to generate</h2>
          <p className="empty-state-desc">
            Select a generation mode above, configure your Jira credentials and AI provider in the left panel,
            then enter a Jira Issue ID to generate comprehensive QA documentation.
          </p>
          <div className="empty-state-modes">
            <div className="empty-state-mode-card">
              <span className="es-mode-icon">🎯</span>
              <div>
                <div className="es-mode-title">Test Strategy</div>
                <div className="es-mode-desc">10-section risk-based QA approach · Markdown/JSON export</div>
              </div>
            </div>
            <div className="empty-state-mode-card">
              <span className="es-mode-icon">📋</span>
              <div>
                <div className="es-mode-title">Test Plan</div>
                <div className="es-mode-desc">Full RICE-POT IEEE 829 document · PDF + DOCX export</div>
              </div>
            </div>
            <div className="empty-state-mode-card">
              <span className="es-mode-icon">🧪</span>
              <div>
                <div className="es-mode-title">Test Cases</div>
                <div className="es-mode-desc">25+ Jira/Zephyr cases · filterable table · CSV export</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
