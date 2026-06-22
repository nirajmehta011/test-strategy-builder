import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import jiraService from '../services/jiraService'
import aiService from '../services/aiService'
import type { TestCase } from '../services/aiService'
import { exportAsMarkdown, exportAsJSON, copyToClipboard, cleanHTMLToText, exportAllAssetsAsZip } from '../services/exportService'
import JiraIDInput, { GenerationInput } from './JiraIDInput'
import type { GenerationMode } from './JiraIDInput'
import StrategyDisplay from './StrategyDisplay'
import TestPlanDisplay from './TestPlanDisplay'
import TestCasesDisplay from './TestCasesDisplay'

const providerLabels: Record<string, string> = {
  groq: '⚡ Groq', openrouter: '🔀 OpenRouter', gemini: '💎 Gemini', openai: '🤖 OpenAI'
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : '/api')

const SUPPORTED_FEATURES = [
  { id: 'strategy', icon: '🎯', title: 'Test Strategy', desc: '10-section risk-based QA approach · Markdown/JSON export' },
  { id: 'plan', icon: '📋', title: 'Test Plan', desc: 'Full RICE-POT IEEE 829 document · PDF + DOCX export' },
  { id: 'cases', icon: '🧪', title: 'Test Cases', desc: 'Detailed test cases · incremental expansion · custom scenarios · CSV export' },
  { id: 'sources', icon: '🌐', title: 'Multi-Input Sources', desc: 'Jira tickets, Website URLs, or Spec Documents (TXT, MD, PDF, DOCX)' },
  { id: 'automate', icon: '🤖', title: 'Automate Any Cases', desc: 'Playwright POM automation generated directly from CSV, Excel, or PDF' },
  { id: 'workflow', icon: '⚡', title: 'Full QA Flow', desc: 'Execute complete QA lifecycle (Strategy → Plan → Cases → Automation) with one click' }
]

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

  // Workflow progress timeline state
  const [workflowState, setWorkflowState] = useState<{
    status: 'idle' | 'running' | 'completed' | 'failed'
    currentStep: 'strategy' | 'plan' | 'cases' | 'automate' | 'done'
    steps: {
      strategy: { status: 'pending' | 'running' | 'completed' | 'failed'; duration?: number }
      plan: { status: 'pending' | 'running' | 'completed' | 'failed'; duration?: number }
      cases: { status: 'pending' | 'running' | 'completed' | 'failed'; duration?: number }
      automate: { status: 'pending' | 'running' | 'completed' | 'failed'; duration?: number }
    }
  }>({
    status: 'idle',
    currentStep: 'strategy',
    steps: {
      strategy: { status: 'pending' },
      plan: { status: 'pending' },
      cases: { status: 'pending' },
      automate: { status: 'pending' }
    }
  })



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

  const generate = async (input: GenerationInput, mode: GenerationMode) => {
    setLoading(true)
    setError(null)
    setActiveMode(mode)
    setStrategy(null)
    setTestPlan(null)
    setTestCases(null)
    setPlaywrightData(null) // reset playwright data on new ticket / regeneration
    setNoMoreCases(false) // reset noMoreCases state
    setWorkflowState({
      status: 'idle',
      currentStep: 'strategy',
      steps: {
        strategy: { status: 'pending' },
        plan: { status: 'pending' },
        cases: { status: 'pending' },
        automate: { status: 'pending' }
      }
    })

    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        const names: Record<string, string> = {
          groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini', openai: 'OpenAI'
        }
        throw new Error(`Please enter your ${names[settings.ai.provider]} API key in the left settings panel.`)
      }

      if (mode === 'workflow') {
        setWorkflowState({
          status: 'running',
          currentStep: 'strategy',
          steps: {
            strategy: { status: 'running' },
            plan: { status: 'pending' },
            cases: { status: 'pending' },
            automate: { status: 'pending' }
          }
        })

        let fetchedIssue: any = null

        if (input.source === 'jira') {
          if (!settings.jira.email || !settings.jira.token || !settings.jira.baseUrl) {
            throw new Error('Please configure your Jira credentials in the left settings panel.')
          }
          const jiraId = input.jiraId || ''
          setCurrentJiraId(jiraId)
          jiraService.initialize(settings.jira.email, settings.jira.token, settings.jira.baseUrl)
          fetchedIssue = await jiraService.fetchIssue(jiraId)
        } else if (input.source === 'url') {
          const url = input.url || ''
          setCurrentJiraId(`URL: ${url}`)
          
          const response = await fetch(`${API_BASE}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          })
          if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.error || 'Failed to fetch/scrape website URL')
          }
          const data = await response.json()
          const cleanedText = cleanHTMLToText(data.html)

          if (!cleanedText) {
            throw new Error('No readable text content found on the scraped page.')
          }

          fetchedIssue = {
            key: 'URL',
            summary: `Scraped Website: ${url}`,
            description: `URL: ${url}\n\nWebpage content:\n${cleanedText}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        } else if (input.source === 'doc') {
          const docName = input.docName || 'Uploaded Spec'
          const docText = input.docText || ''
          setCurrentJiraId(`Doc: ${docName}`)

          fetchedIssue = {
            key: 'DOC',
            summary: `Document: ${docName}`,
            description: `Document Name: ${docName}\n\nDocument specification content:\n${docText}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        } else if (input.source === 'visual') {
          const hasFiles = !!(input.mediaFiles && input.mediaFiles.length > 0)
          const fileNames = input.mediaFiles ? input.mediaFiles.map(f => f.name).join(', ') : 'None'
          const figmaUrl = input.figmaUrl || ''
          const focusArea = input.focusArea || ''
          const scopeOption = input.scopeOption || 'all'

          setCurrentJiraId((input.mediaFiles && hasFiles) ? `Visual Spec: ${input.mediaFiles[0].name}` : 'Visual Mockups')

          fetchedIssue = {
            key: 'VISUAL',
            summary: hasFiles ? `Visual Walkthrough / Screenshots: ${fileNames}` : `Figma Mockups: ${figmaUrl}`,
            description: `Visual specification requirement analysis:
- Uploaded Spec Files: ${fileNames}
- Figma URL: ${figmaUrl || 'None'}
- Scope Focus Option: ${scopeOption === 'specific' ? 'LIMIT TO SPECIFIC FEATURE ONLY' : 'ALL POSSIBLE CASES / FEATURES'}
- Focus/Feature Scope Instructions: ${focusArea || 'None'}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        }

        if (!fetchedIssue) {
          throw new Error('Could not resolve generation input.')
        }

        setJiraIssue(fetchedIssue)

        const prov = settings.ai.provider
        const model = getModel()

        // Step 1: Strategy
        const startStrategy = Date.now()
        let stratResult = ''
        try {
          stratResult = await aiService.generateTestStrategy(prov, apiKey, model, fetchedIssue, input.mediaFiles)
          const duration = Math.round((Date.now() - startStrategy) / 1000)
          setStrategy(stratResult)
          setWorkflowState(prev => ({
            ...prev,
            currentStep: 'plan',
            steps: {
              ...prev.steps,
              strategy: { status: 'completed', duration },
              plan: { status: 'running' }
            }
          }))
        } catch (err: any) {
          const duration = Math.round((Date.now() - startStrategy) / 1000)
          setWorkflowState(prev => ({
            ...prev,
            status: 'failed',
            steps: {
              ...prev.steps,
              strategy: { status: 'failed', duration }
            }
          }))
          throw new Error(`[Strategy Builder] ${err.message || 'Generation failed'}`)
        }

        // Step 2: Test Plan
        const startPlan = Date.now()
        let planResult = ''
        try {
          planResult = await aiService.generateTestPlan(prov, apiKey, model, fetchedIssue, stratResult, input.mediaFiles)
          const duration = Math.round((Date.now() - startPlan) / 1000)
          setTestPlan(planResult)
          setWorkflowState(prev => ({
            ...prev,
            currentStep: 'cases',
            steps: {
              ...prev.steps,
              plan: { status: 'completed', duration },
              cases: { status: 'running' }
            }
          }))
        } catch (err: any) {
          const duration = Math.round((Date.now() - startPlan) / 1000)
          setWorkflowState(prev => ({
            ...prev,
            status: 'failed',
            steps: {
              ...prev.steps,
              plan: { status: 'failed', duration }
            }
          }))
          throw new Error(`[RICE-POT Test Plan] ${err.message || 'Generation failed'}`)
        }

        // Step 3: Test Cases
        const startCases = Date.now()
        let casesResult: TestCase[] = []
        try {
          casesResult = await aiService.generateTestCases(prov, apiKey, model, fetchedIssue, planResult, input.mediaFiles)
          const duration = Math.round((Date.now() - startCases) / 1000)
          setTestCases(casesResult)
          setWorkflowState(prev => ({
            ...prev,
            currentStep: 'automate',
            steps: {
              ...prev.steps,
              cases: { status: 'completed', duration },
              automate: { status: 'running' }
            }
          }))
        } catch (err: any) {
          const duration = Math.round((Date.now() - startCases) / 1000)
          setWorkflowState(prev => ({
            ...prev,
            status: 'failed',
            steps: {
              ...prev.steps,
              cases: { status: 'failed', duration }
            }
          }))
          throw new Error(`[Test Cases Generator] ${err.message || 'Generation failed'}`)
        }

        // Step 4: Playwright POM Automation
        const startAutomate = Date.now()
        try {
          const autoResult = await aiService.generatePlaywrightTests(prov, apiKey, model, fetchedIssue, casesResult)
          const duration = Math.round((Date.now() - startAutomate) / 1000)
          setPlaywrightData(autoResult)
          setWorkflowState(prev => ({
            ...prev,
            status: 'completed',
            currentStep: 'done',
            steps: {
              ...prev.steps,
              automate: { status: 'completed', duration }
            }
          }))
          setProviderUsed(prov)
          setViewTab('strategy')
        } catch (err: any) {
          const duration = Math.round((Date.now() - startAutomate) / 1000)
          setWorkflowState(prev => ({
            ...prev,
            status: 'failed',
            steps: {
              ...prev.steps,
              automate: { status: 'failed', duration }
            }
          }))
          throw new Error(`[Playwright POM Automation] ${err.message || 'Automation failed'}`)
        }
      } else {
        let fetchedIssue: any = null

        if (input.source === 'jira') {
          if (!settings.jira.email || !settings.jira.token || !settings.jira.baseUrl) {
            throw new Error('Please configure your Jira credentials in the left settings panel.')
          }
          const jiraId = input.jiraId || ''
          setCurrentJiraId(jiraId)
          jiraService.initialize(settings.jira.email, settings.jira.token, settings.jira.baseUrl)
          fetchedIssue = await jiraService.fetchIssue(jiraId)
        } else if (input.source === 'url') {
          const url = input.url || ''
          setCurrentJiraId(`URL: ${url}`)
          
          // Scraping the URL via backend API
          const response = await fetch(`${API_BASE}/fetch-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          })
          if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.error || 'Failed to fetch/scrape website URL')
          }
          const data = await response.json()
          const cleanedText = cleanHTMLToText(data.html)

          if (!cleanedText) {
            throw new Error('No readable text content found on the scraped page.')
          }

          fetchedIssue = {
            key: 'URL',
            summary: `Scraped Website: ${url}`,
            description: `URL: ${url}\n\nWebpage content:\n${cleanedText}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        } else if (input.source === 'doc') {
          const docName = input.docName || 'Uploaded Spec'
          const docText = input.docText || ''
          setCurrentJiraId(`Doc: ${docName}`)

          fetchedIssue = {
            key: 'DOC',
            summary: `Document: ${docName}`,
            description: `Document Name: ${docName}\n\nDocument specification content:\n${docText}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        } else if (input.source === 'visual') {
          const hasFiles = !!(input.mediaFiles && input.mediaFiles.length > 0)
          const fileNames = input.mediaFiles ? input.mediaFiles.map(f => f.name).join(', ') : 'None'
          const figmaUrl = input.figmaUrl || ''
          const focusArea = input.focusArea || ''
          const scopeOption = input.scopeOption || 'all'

          setCurrentJiraId((input.mediaFiles && hasFiles) ? `Visual Spec: ${input.mediaFiles[0].name}` : 'Visual Mockups')

          fetchedIssue = {
            key: 'VISUAL',
            summary: hasFiles ? `Visual Walkthrough / Screenshots: ${fileNames}` : `Figma Mockups: ${figmaUrl}`,
            description: `Visual specification requirement analysis:
- Uploaded Spec Files: ${fileNames}
- Figma URL: ${figmaUrl || 'None'}
- Scope Focus Option: ${scopeOption === 'specific' ? 'LIMIT TO SPECIFIC FEATURE ONLY' : 'ALL POSSIBLE CASES / FEATURES'}
- Focus/Feature Scope Instructions: ${focusArea || 'None'}`,
            priority: 'Medium',
            status: 'Active',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        }

        if (!fetchedIssue) {
          throw new Error('Could not resolve generation input.')
        }

        setJiraIssue(fetchedIssue)

        const prov = settings.ai.provider
        const model = getModel()
    
        if (mode === 'strategy') {
          const result = await aiService.generateTestStrategy(prov, apiKey, model, fetchedIssue, input.mediaFiles)
          setStrategy(result)
          setViewTab('strategy')
        } else if (mode === 'plan') {
          const result = await aiService.generateTestPlan(prov, apiKey, model, fetchedIssue, undefined, input.mediaFiles)
          setTestPlan(result)
          setViewTab('plan')
        } else if (mode === 'cases') {
          const result = await aiService.generateTestCases(prov, apiKey, model, fetchedIssue, undefined, input.mediaFiles)
          setTestCases(result)
          setViewTab('cases')
        }
    
        setProviderUsed(prov)
      }
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
    automate_csv: 'Parsing and automating test cases from file (this may take ~90s)',
    workflow: 'Running complete QA workflow pipeline (this may take ~2-3 mins)'
  }

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">QA Nexus Suite</h1>
        <p className="page-subtitle">
          Generate comprehensive Test Strategies, RICE-POT Test Plans, and Jira/Zephyr Test Cases from Jira tickets, Web URLs, or Specification Documents
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
      {loading && activeMode !== 'workflow' && (
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

      {/* Workflow Stepper Progress Timeline */}
      {activeMode === 'workflow' && (loading || workflowState.status !== 'idle') && (
        <div className="strategy-card animate-in" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Full QA Flow Pipeline</span>
            </div>
            <span className={`workflow-status-badge ${workflowState.status}`}>
              {workflowState.status === 'running' && '⏳ Running'}
              {workflowState.status === 'completed' && '✅ Completed'}
              {workflowState.status === 'failed' && '❌ Failed'}
            </span>
          </div>
          
          <div className="workflow-timeline">
            {/* Step 1: Strategy */}
            <div className={`workflow-step ${workflowState.steps.strategy.status}`}>
              <div className="workflow-step-bullet">
                {workflowState.steps.strategy.status === 'completed' ? '✓' : '1'}
              </div>
              <div className="workflow-step-details">
                <div className="workflow-step-header">
                  <span className="workflow-step-name">🎯 Test Strategy Builder</span>
                  {workflowState.steps.strategy.duration !== undefined && (
                    <span className="workflow-step-time">{workflowState.steps.strategy.duration}s</span>
                  )}
                </div>
                <p className="workflow-step-desc">
                  {workflowState.steps.strategy.status === 'pending' && 'Pending...'}
                  {workflowState.steps.strategy.status === 'running' && 'Analyzing input specs & generating risk-based strategy...'}
                  {workflowState.steps.strategy.status === 'completed' && 'Strategy generation complete.'}
                  {workflowState.steps.strategy.status === 'failed' && 'Strategy generation failed.'}
                </p>
              </div>
            </div>

            {/* Step 2: Plan */}
            <div className={`workflow-step ${workflowState.steps.plan.status}`}>
              <div className="workflow-step-bullet">
                {workflowState.steps.plan.status === 'completed' ? '✓' : '2'}
              </div>
              <div className="workflow-step-details">
                <div className="workflow-step-header">
                  <span className="workflow-step-name">📋 RICE-POT Test Plan</span>
                  {workflowState.steps.plan.duration !== undefined && (
                    <span className="workflow-step-time">{workflowState.steps.plan.duration}s</span>
                  )}
                </div>
                <p className="workflow-step-desc">
                  {workflowState.steps.plan.status === 'pending' && 'Waiting for strategy...'}
                  {workflowState.steps.plan.status === 'running' && 'Aligning strategy details & building RICE-POT IEEE 829 test plan...'}
                  {workflowState.steps.plan.status === 'completed' && 'RICE-POT test plan complete.'}
                  {workflowState.steps.plan.status === 'failed' && 'Test plan generation failed.'}
                </p>
              </div>
            </div>

            {/* Step 3: Test Cases */}
            <div className={`workflow-step ${workflowState.steps.cases.status}`}>
              <div className="workflow-step-bullet">
                {workflowState.steps.cases.status === 'completed' ? '✓' : '3'}
              </div>
              <div className="workflow-step-details">
                <div className="workflow-step-header">
                  <span className="workflow-step-name">🧪 Detailed Test Cases</span>
                  {workflowState.steps.cases.duration !== undefined && (
                    <span className="workflow-step-time">{workflowState.steps.cases.duration}s</span>
                  )}
                </div>
                <p className="workflow-step-desc">
                  {workflowState.steps.cases.status === 'pending' && 'Waiting for test plan...'}
                  {workflowState.steps.cases.status === 'running' && 'Generating high-quality test cases for all scenarios...'}
                  {workflowState.steps.cases.status === 'completed' && `Generated ${testCases?.length || 0} detailed test cases.`}
                  {workflowState.steps.cases.status === 'failed' && 'Test cases generation failed.'}
                </p>
              </div>
            </div>

            {/* Step 4: Automate */}
            <div className={`workflow-step ${workflowState.steps.automate.status}`}>
              <div className="workflow-step-bullet">
                {workflowState.steps.automate.status === 'completed' ? '✓' : '4'}
              </div>
              <div className="workflow-step-details">
                <div className="workflow-step-header">
                  <span className="workflow-step-name">🤖 Playwright POM Automation</span>
                  {workflowState.steps.automate.duration !== undefined && (
                    <span className="workflow-step-time">{workflowState.steps.automate.duration}s</span>
                  )}
                </div>
                <p className="workflow-step-desc">
                  {workflowState.steps.automate.status === 'pending' && 'Waiting for test cases...'}
                  {workflowState.steps.automate.status === 'running' && 'Compiling executable Playwright Page Object classes & spec files...'}
                  {workflowState.steps.automate.status === 'completed' && 'Playwright test automation generation complete.'}
                  {workflowState.steps.automate.status === 'failed' && 'Playwright automation failed.'}
                </p>
              </div>
            </div>
          </div>

          {workflowState.status === 'completed' && (
            <div className="workflow-completed-actions animate-in">
              <span className="workflow-celebrate">🎉 Pipeline Completed! Click on the tabs below to explore all output assets.</span>
              <button 
                type="button" 
                className="btn-export btn-export-accent btn-export-workflow-zip"
                onClick={() => exportAllAssetsAsZip(currentJiraId, strategy, testPlan, testCases, playwrightData)}
              >
                📦 Download All QA Assets (.ZIP)
              </button>
            </div>
          )}
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
            Select a generation mode above, configure your AI provider in the left panel,
            then input your Jira ticket, Web URL, or Spec Document to generate comprehensive QA documentation.
          </p>
          <div className="empty-state-modes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {SUPPORTED_FEATURES.map(feat => (
              <div key={feat.id} className="empty-state-mode-card">
                <span className="es-mode-icon">{feat.icon}</span>
                <div>
                  <div className="es-mode-title">{feat.title}</div>
                  <div className="es-mode-desc">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
