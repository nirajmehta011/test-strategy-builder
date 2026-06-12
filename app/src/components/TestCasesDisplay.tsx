import { useState, useMemo } from 'react'
import { exportTestCasesAsCSV, exportPlaywrightAsMD, exportPlaywrightAsZip } from '../services/exportService'
import type { TestCase, PlaywrightAutomationData } from '../services/aiService'

interface TestCasesDisplayProps {
  testCases: TestCase[]
  jiraId: string
  provider: string
  onAddMoreCases: () => Promise<void>
  isAddingCases: boolean
  onAutomateCases: () => Promise<void>
  isAutomating: boolean
  playwrightData: PlaywrightAutomationData | null
  onAddCustomCase: (customScenario: string) => Promise<void>
  isAddingCustomCase: boolean
  noMoreCases: boolean
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  dot: '#ef4444' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)', dot: '#f97316' },
  Medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.1)',  dot: '#eab308' },
  Low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  dot: '#22c55e' },
}

const SCENARIO_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  happy_path:  { icon: '✅', label: 'Happy Path',   color: '#22c55e' },
  negative:    { icon: '❌', label: 'Negative',      color: '#ef4444' },
  edge_case:   { icon: '⚡', label: 'Edge Case',     color: '#f97316' },
  boundary:    { icon: '📐', label: 'Boundary',      color: '#eab308' },
  ui_ux:       { icon: '🎨', label: 'UI/UX',         color: '#8b5cf6' },
  security:    { icon: '🔒', label: 'Security',      color: '#06b6d4' },
  performance: { icon: '⚡', label: 'Performance',   color: '#6366f1' },
}

const FILTER_OPTIONS = [
  { id: 'all',         label: 'All Cases',    icon: '📋' },
  { id: 'happy_path',  label: 'Happy Path',   icon: '✅' },
  { id: 'negative',    label: 'Negative',     icon: '❌' },
  { id: 'edge_case',   label: 'Edge Cases',   icon: '⚡' },
  { id: 'boundary',    label: 'Boundary',     icon: '📐' },
  { id: 'ui_ux',       label: 'UI/UX',        icon: '🎨' },
  { id: 'security',    label: 'Security',     icon: '🔒' },
  { id: 'performance', label: 'Performance',  icon: '📊' },
]

const providerLabels: Record<string, string> = {
  groq: '⚡ Groq', openrouter: '🔀 OpenRouter', gemini: '💎 Gemini', openai: '🤖 OpenAI'
}

export default function TestCasesDisplay({
  testCases,
  jiraId,
  provider,
  onAddMoreCases,
  isAddingCases,
  onAutomateCases,
  isAutomating,
  playwrightData,
  onAddCustomCase,
  isAddingCustomCase,
  noMoreCases
}: TestCasesDisplayProps) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'type'>('id')
  const [activePwTab, setActivePwTab] = useState<string>('readme')
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Custom Scenario Input State
  const [customScenarioText, setCustomScenarioText] = useState('')

  const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

  const filtered = useMemo(() => {
    let result = [...testCases]
    if (filter !== 'all') result = result.filter(tc => tc.scenarioType === filter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(tc =>
        tc.summary?.toLowerCase().includes(q) ||
        tc.component?.toLowerCase().includes(q) ||
        tc.testType?.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'priority') result.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
    if (sortBy === 'type') result.sort((a, b) => (a.scenarioType || '').localeCompare(b.scenarioType || ''))
    return result
  }, [testCases, filter, search, sortBy])

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    testCases.forEach(tc => { counts[tc.scenarioType] = (counts[tc.scenarioType] || 0) + 1 })
    return counts
  }, [testCases])

  const totalSteps = useMemo(() => testCases.reduce((s, tc) => s + (tc.steps?.length || 0), 0), [testCases])

  const getCodeToDisplay = () => {
    if (!playwrightData) return ''
    if (activePwTab === 'readme') return playwrightData.readme
    if (activePwTab === 'package.json') return playwrightData.packageJson
    if (activePwTab === 'tsconfig.json') return playwrightData.tsconfigJson
    if (activePwTab === 'playwright.config.ts') return playwrightData.playwrightConfig
    const file = playwrightData.testFiles.find(f => f.filename === activePwTab)
    return file ? file.code : ''
  }

  const handleCopyCode = async () => {
    const code = getCodeToDisplay()
    if (!code) return
    const ok = await navigator.clipboard.writeText(code).then(() => true).catch(() => false)
    if (ok) {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleGenerateCustomCase = async () => {
    if (!customScenarioText.trim()) return
    await onAddCustomCase(customScenarioText.trim())
    setCustomScenarioText('')
  }

  return (
    <div className="animate-in">
      {/* Stats Bar */}
      <div className="tc-stats-bar">
        <div className="tc-stat">
          <span className="tc-stat-num">{testCases.length}</span>
          <span className="tc-stat-label">Total Cases</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-num">{totalSteps}</span>
          <span className="tc-stat-label">Total Steps</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-num" style={{ color: '#ef4444' }}>{(stats['happy_path'] || 0) + (stats['negative'] || 0)}</span>
          <span className="tc-stat-label">Functional</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-num" style={{ color: '#f97316' }}>{stats['edge_case'] || 0}</span>
          <span className="tc-stat-label">Edge Cases</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-num" style={{ color: '#06b6d4' }}>{stats['security'] || 0}</span>
          <span className="tc-stat-label">Security</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-num" style={{ color: '#6366f1' }}>{stats['boundary'] || 0}</span>
          <span className="tc-stat-label">Boundary</span>
        </div>
        <div className="tc-stat-provider">
          <span>{providerLabels[provider] || provider}</span>
        </div>
      </div>

      {/* Filter + Search Bar */}
      <div className="tc-toolbar">
        <div className="tc-filters">
          {FILTER_OPTIONS.map(opt => {
            const count = opt.id === 'all' ? testCases.length : (stats[opt.id] || 0)
            return (
              <button
                key={opt.id}
                className={`tc-filter-btn ${filter === opt.id ? 'active' : ''}`}
                onClick={() => setFilter(opt.id)}
              >
                {opt.icon} {opt.label}
                {count > 0 && <span className="tc-filter-count">{count}</span>}
              </button>
            )
          })}
        </div>
        <div className="tc-toolbar-right">
          <input
            type="search"
            className="tc-search"
            placeholder="Search cases…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="tc-sort" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="id">Sort: ID</option>
            <option value="priority">Sort: Priority</option>
            <option value="type">Sort: Type</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tc-table-wrapper">
        <table className="tc-table">
          <thead>
            <tr>
              <th style={{ width: 72 }}>ID</th>
              <th>Summary</th>
              <th style={{ width: 90 }}>Type</th>
              <th style={{ width: 88 }}>Priority</th>
              <th style={{ width: 110 }}>Scenario</th>
              <th style={{ width: 80 }}>Steps</th>
              <th style={{ width: 70 }}>Time</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tc, idx) => {
              const priorityCfg = PRIORITY_CONFIG[tc.priority] || PRIORITY_CONFIG['Medium']
              const scenarioCfg = SCENARIO_CONFIG[tc.scenarioType] || { icon: '🔹', label: tc.scenarioType, color: '#6366f1' }
              const isExpanded = expandedId === tc.id

              return (
                <optgroup key={tc.id} style={{ border: 'none' }}>
                  <tr
                    className={`tc-row ${idx % 2 === 0 ? 'tc-row-even' : ''} ${isExpanded ? 'tc-row-expanded' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : tc.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="tc-id">{tc.id}</span>
                    </td>
                    <td className="tc-summary">{tc.summary}</td>
                    <td>
                      <span className="tc-type-badge">{tc.testType}</span>
                    </td>
                    <td>
                      <span className="tc-priority-badge" style={{ color: priorityCfg.color, background: priorityCfg.bg }}>
                        <span className="tc-priority-dot" style={{ background: priorityCfg.dot }} />
                        {tc.priority}
                      </span>
                    </td>
                    <td>
                      <span className="tc-scenario-badge" style={{ color: scenarioCfg.color }}>
                        {scenarioCfg.icon} {scenarioCfg.label}
                      </span>
                    </td>
                    <td>
                      <span className="tc-steps-count">{tc.steps?.length || 0} steps</span>
                    </td>
                    <td>
                      <span className="tc-time">{tc.estimatedTime}</span>
                    </td>
                    <td>
                      <span className={`tc-expand-icon ${isExpanded ? 'open' : ''}`}>▶</span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="tc-detail-row">
                      <td colSpan={8}>
                        <div className="tc-detail">
                          {tc.precondition && (
                            <div className="tc-precondition">
                              <span className="tc-detail-label">📌 Precondition:</span>
                              <span>{tc.precondition}</span>
                            </div>
                          )}
                          {tc.component && (
                            <div className="tc-component-row">
                              <span className="tc-detail-label">🔧 Component:</span>
                              <span className="tc-component-badge">{tc.component}</span>
                              <span className="tc-detail-label" style={{ marginLeft: 16 }}>🏷️ Labels:</span>
                              <span className="tc-component-badge">{tc.labels}</span>
                            </div>
                          )}
                          <div className="tc-steps-table-wrapper">
                            <table className="tc-steps-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 44 }}>#</th>
                                  <th>Action</th>
                                  <th style={{ width: '28%' }}>Test Data</th>
                                  <th style={{ width: '30%' }}>Expected Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(tc.steps || []).map(step => (
                                  <tr key={step.stepNumber} className="tc-step-row">
                                    <td>
                                      <span className="tc-step-num">{step.stepNumber}</span>
                                    </td>
                                    <td className="tc-step-action">{step.action}</td>
                                    <td className="tc-step-data">
                                      {step.testData && step.testData !== 'N/A' ? (
                                        <code className="tc-step-data-code">{step.testData}</code>
                                      ) : (
                                        <span className="tc-step-na">N/A</span>
                                      )}
                                    </td>
                                    <td className="tc-step-expected">{step.expectedResult}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </optgroup>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="tc-empty">
            <span style={{ fontSize: 32 }}>🔍</span>
            <p>No test cases match your filter</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>
        Showing {filtered.length} of {testCases.length} test cases
      </div>

      {/* No More Cases Warning & Custom Scenario Input */}
      {noMoreCases && (
        <div className="no-more-cases-alert animate-in" style={{ marginTop: 20, padding: 16, borderRadius: 8, background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.25)', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 'bold', color: '#d97706' }}>All Standard Scenarios Covered</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>The QA Nexus AI framework indicates all key ticket flows are covered. If you have a specific scenario you would like to test, describe it below to generate a new detailed case.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="tc-search"
              placeholder="e.g., Verify validation when entering a maximum integer value..."
              value={customScenarioText}
              onChange={e => setCustomScenarioText(e.target.value)}
              disabled={isAddingCustomCase}
              style={{ flex: 1, height: 38 }}
            />
            <button
              className="btn-export btn-export-cyan"
              onClick={handleGenerateCustomCase}
              disabled={isAddingCustomCase || !customScenarioText.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
            >
              {isAddingCustomCase ? (
                <>
                  <span className="loading-ring-small" /> Generating...
                </>
              ) : (
                <>➕ Add Custom Case</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* QA Actions and Automation Panel */}
      <div className="qa-actions-panel" style={{ marginTop: 24, padding: 16, borderRadius: 8, background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 'bold', color: 'var(--text-primary)' }}>🛠️ QA Actions & Expansion</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Expand test coverage dynamically or generate automated Playwright tests</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn-export btn-export-purple"
              onClick={onAddMoreCases}
              disabled={isAddingCases || isAutomating || isAddingCustomCase}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isAddingCases ? (
                <>
                  <span className="loading-ring-small" /> Adding Cases...
                </>
              ) : (
                <>➕ Add More Test Cases</>
              )}
            </button>
            <button
              className="btn-export btn-export-green"
              onClick={onAutomateCases}
              disabled={isAutomating || isAddingCases || isAddingCustomCase}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isAutomating ? (
                <>
                  <span className="loading-ring-small" /> Automating...
                </>
              ) : (
                <>🤖 Automate Test Cases</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Playwright Automation Section */}
      {playwrightData && (
        <div className="playwright-automation-card animate-in" style={{ marginTop: 24, padding: 16, borderRadius: 8, background: 'var(--bg-surface-2)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="playwright-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: '#10b981' }}>🎭 Playwright TypeScript Automation Framework</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Configure, extract, and import directly to VS Code or any IDE</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-export btn-export-cyan"
                onClick={() => exportPlaywrightAsMD(playwrightData, jiraId)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                📝 Download MD File
              </button>
              <button
                className="btn-export btn-export-green"
                onClick={() => exportPlaywrightAsZip(playwrightData, jiraId)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                📦 Download Project (.zip)
              </button>
            </div>
          </div>

          <div className="playwright-preview-tabs" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 6 }}>
            <button
              className={`pw-tab-btn ${activePwTab === 'readme' ? 'active' : ''}`}
              onClick={() => setActivePwTab('readme')}
            >
              📄 README.md
            </button>
            <button
              className={`pw-tab-btn ${activePwTab === 'package.json' ? 'active' : ''}`}
              onClick={() => setActivePwTab('package.json')}
            >
              📦 package.json
            </button>
            <button
              className={`pw-tab-btn ${activePwTab === 'playwright.config.ts' ? 'active' : ''}`}
              onClick={() => setActivePwTab('playwright.config.ts')}
            >
              ⚙️ playwright.config.ts
            </button>
            {playwrightData.testFiles.map(file => {
              const fname = file.filename.split('/').pop() || file.filename
              return (
                <button
                  key={file.filename}
                  className={`pw-tab-btn ${activePwTab === file.filename ? 'active' : ''}`}
                  onClick={() => setActivePwTab(file.filename)}
                >
                  🧪 {fname}
                </button>
              )
            })}
          </div>

          <div className="playwright-code-preview" style={{ background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)', padding: 16, position: 'relative' }}>
            <button
              onClick={handleCopyCode}
              style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', fontSize: 11, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer' }}
            >
              {copiedCode ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <pre style={{ margin: 0, maxHeight: 400, overflowY: 'auto', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
              <code>{getCodeToDisplay()}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Export Bar */}
      <div className="export-bar" style={{ marginTop: 24 }}>
        <button
          className="btn-export btn-export-cyan"
          onClick={() => exportTestCasesAsCSV(testCases, jiraId)}
        >
          📊 Export CSV (Jira Import)
        </button>
        <button
          className="btn-export btn-export-cyan"
          onClick={() => exportTestCasesAsCSV(filtered, `${jiraId}-filtered`)}
          disabled={filtered.length === testCases.length}
        >
          📊 Export Filtered CSV
        </button>
      </div>
    </div>
  )
}
