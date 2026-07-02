import { useState, useEffect } from 'react'
import { useSettings, AIProvider } from '../context/SettingsContext'
import aiService, { AIModel } from '../services/aiService'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : '/api')

const PROVIDERS: { id: AIProvider; label: string; icon: string; placeholder: string; getUrl: string }[] = [
  { id: 'groq', label: 'Groq', icon: '⚡', placeholder: 'gsk_...', getUrl: 'https://console.groq.com/keys' },
  { id: 'openrouter', label: 'OpenRouter', icon: '🔀', placeholder: 'sk-or-...', getUrl: 'https://openrouter.ai/keys' },
  { id: 'gemini', label: 'Gemini', icon: '💎', placeholder: 'AIza...', getUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'openai', label: 'OpenAI', icon: '🤖', placeholder: 'sk-...', getUrl: 'https://platform.openai.com/api-keys' },
]

export default function LeftPanel() {
  const { settings, updateAI, updateJira, updatePreferences } = useSettings()

  const [jiraOpen, setJiraOpen] = useState(true)
  const [aiOpen, setAiOpen] = useState(true)
  const [prefOpen, setPrefOpen] = useState(false)

  const [testingJira, setTestingJira] = useState(false)
  const [jiraStatus, setJiraStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const [testingAI, setTestingAI] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loadedModels, setLoadedModels] = useState<AIModel[]>([])

  const activeProvider = PROVIDERS.find(p => p.id === settings.ai.provider)!

  const getApiKey = (provider: AIProvider) => {
    switch (provider) {
      case 'groq': return settings.ai.groqApiKey
      case 'openrouter': return settings.ai.openRouterApiKey
      case 'gemini': return settings.ai.geminiApiKey
      case 'openai': return settings.ai.openAiApiKey
    }
  }

  const setApiKey = (provider: AIProvider, key: string) => {
    switch (provider) {
      case 'groq': return updateAI({ groqApiKey: key })
      case 'openrouter': return updateAI({ openRouterApiKey: key })
      case 'gemini': return updateAI({ geminiApiKey: key })
      case 'openai': return updateAI({ openAiApiKey: key })
    }
  }

  const getSelectedModel = () => {
    switch (settings.ai.provider) {
      case 'groq': return settings.ai.selectedModel
      case 'openrouter': return settings.ai.openRouterModel
      case 'gemini': return settings.ai.geminiModel
      case 'openai': return settings.ai.openAiModel
    }
  }

  const setSelectedModel = (model: string) => {
    switch (settings.ai.provider) {
      case 'groq': return updateAI({ selectedModel: model })
      case 'openrouter': return updateAI({ openRouterModel: model })
      case 'gemini': return updateAI({ geminiModel: model })
      case 'openai': return updateAI({ openAiModel: model })
    }
  }

  const testJira = async () => {
    if (!settings.jira.baseUrl || !settings.jira.email || !settings.jira.token) {
      setJiraStatus({ ok: false, msg: 'Fill in all Jira fields first.' })
      return
    }
    setTestingJira(true)
    setJiraStatus(null)
    try {
      const resp = await fetch(`${API_BASE}/jira/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.jira)
      })
      const data = await resp.json()
      if (resp.ok) {
        setJiraStatus({ ok: true, msg: `Connected as ${data.user?.displayName || 'User'}` })
      } else {
        setJiraStatus({ ok: false, msg: data.error || 'Connection failed' })
      }
    } catch {
      setJiraStatus({ ok: false, msg: 'Cannot reach backend server.' })
    } finally {
      setTestingJira(false)
    }
  }

  const testAI = async () => {
    const key = getApiKey(settings.ai.provider)
    if (!key) {
      setAiStatus({ ok: false, msg: 'Enter an API key first.' })
      return
    }
    setTestingAI(true)
    setAiStatus(null)
    const result = await aiService.testConnection(settings.ai.provider, key)
    if (result.success && result.models && result.models.length > 0) {
      setLoadedModels(result.models)
    }
    setAiStatus({ ok: result.success, msg: result.message.replace(/^[✅❌]\s*/, '') })
    setTestingAI(false)
  }

  // Load default models when provider changes
  useEffect(() => {
    setLoadedModels(aiService.getDefaultModels(settings.ai.provider))
    setAiStatus(null)
  }, [settings.ai.provider])

  const displayModels = loadedModels.length > 0 ? loadedModels : aiService.getDefaultModels(settings.ai.provider)

  const collapsed = settings.preferences.sidebarCollapsed

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-scroll">

        {/* ── Jira Section ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setJiraOpen(v => !v)}>
            <span className="sidebar-section-title">
              <span>🔗</span> Jira
            </span>
            <span className={`sidebar-section-chevron ${jiraOpen ? 'open' : ''}`}>▶</span>
          </div>

          {jiraOpen && (
            <div className="sidebar-section-body animate-in">
              <div className="field-group">
                <label className="field-label">Base URL</label>
                <input
                  className="field-input"
                  type="url"
                  value={settings.jira.baseUrl}
                  onChange={e => updateJira({ baseUrl: e.target.value })}
                  placeholder="https://your-org.atlassian.net"
                />
              </div>
              <div className="field-group">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  value={settings.jira.email}
                  onChange={e => updateJira({ email: e.target.value })}
                  placeholder="you@company.com"
                />
              </div>
              <div className="field-group">
                <label className="field-label">API Token</label>
                <input
                  className="field-input"
                  type="password"
                  value={settings.jira.token}
                  onChange={e => updateJira({ token: e.target.value })}
                  placeholder="ATATT3x..."
                />
                <div style={{ marginTop: 4 }}>
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    Get API token ↗
                  </a>
                </div>
              </div>
              <button className="btn-sidebar btn-sidebar-primary" onClick={testJira} disabled={testingJira} style={{ marginBottom: 8 }}>
                {testingJira ? '⏳ Testing...' : '🔌 Test Connection'}
              </button>
              {jiraStatus && (
                <div className={`status-badge ${jiraStatus.ok ? 'success' : 'error'}`}>
                  {jiraStatus.ok ? '✓' : '✗'} {jiraStatus.msg}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        {/* ── AI Provider Section ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setAiOpen(v => !v)}>
            <span className="sidebar-section-title">
              <span>🤖</span> AI Provider
            </span>
            <span className={`sidebar-section-chevron ${aiOpen ? 'open' : ''}`}>▶</span>
          </div>

          {aiOpen && (
            <div className="sidebar-section-body animate-in">
              {/* Provider Selector */}
              <div className="provider-grid" style={{ marginBottom: 12 }}>
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    className={`provider-pill ${settings.ai.provider === p.id ? 'active' : ''}`}
                    onClick={() => updateAI({ provider: p.id })}
                  >
                    <span className="provider-pill-icon">{p.icon}</span>
                    <span className="provider-pill-label">{p.label}</span>
                  </button>
                ))}
              </div>

              {/* API Key for selected provider */}
              <div className="field-group">
                <label className="field-label">{activeProvider.label} API Key</label>
                <input
                  className="field-input"
                  type="password"
                  value={getApiKey(settings.ai.provider)}
                  onChange={e => setApiKey(settings.ai.provider, e.target.value)}
                  placeholder={activeProvider.placeholder}
                />
                <div style={{ marginTop: 4 }}>
                  <a
                    href={activeProvider.getUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    Get {activeProvider.label} API key ↗
                  </a>
                </div>
              </div>

              {/* Model Selector */}
              <div className="field-group">
                <label className="field-label">Model</label>
                <select
                  className="field-select"
                  value={getSelectedModel()}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {displayModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Test AI button */}
              <button className="btn-sidebar btn-sidebar-primary" onClick={testAI} disabled={testingAI} style={{ marginBottom: 8 }}>
                {testingAI ? '⏳ Testing...' : '⚡ Test & Load Models'}
              </button>

              {aiStatus && (
                <div className={`status-badge ${aiStatus.ok ? 'success' : 'error'}`}>
                  {aiStatus.ok ? '✓' : '✗'} {aiStatus.msg}
                </div>
              )}

              {aiStatus?.ok && loadedModels.length > 0 && (
                <div className="status-badge info" style={{ marginTop: 6 }}>
                  ℹ {loadedModels.length} live models loaded
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        {/* ── Preferences Section ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setPrefOpen(v => !v)}>
            <span className="sidebar-section-title">
              <span>⚙️</span> Preferences
            </span>
            <span className={`sidebar-section-chevron ${prefOpen ? 'open' : ''}`}>▶</span>
          </div>

          {prefOpen && (
            <div className="sidebar-section-body animate-in">
              <div className="toggle-row">
                <span className="toggle-label">Auto-save strategies</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.preferences.autoSave}
                    onChange={e => updatePreferences({ autoSave: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* ── Test Case Generation Mode Toggle ── */}
              <div style={{ marginTop: 14 }}>
                <div className="field-label" style={{ marginBottom: 8 }}>Test Case Generation</div>
                <div style={{ display: 'flex', gap: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => updatePreferences({ useRulesEngine: false })}
                    style={{
                      flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                      background: !settings.preferences.useRulesEngine ? 'var(--accent)' : 'transparent',
                      color: !settings.preferences.useRulesEngine ? '#fff' : 'var(--sidebar-muted)',
                    }}
                  >
                    ⚡ AI-Powered
                  </button>
                  <button
                    onClick={() => updatePreferences({ useRulesEngine: true })}
                    style={{
                      flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                      background: settings.preferences.useRulesEngine ? '#059669' : 'transparent',
                      color: settings.preferences.useRulesEngine ? '#fff' : 'var(--sidebar-muted)',
                    }}
                  >
                    🧠 Smart Rules
                  </button>
                </div>
                {settings.preferences.useRulesEngine ? (
                  <div className="status-badge success" style={{ marginTop: 8, fontSize: 10 }}>
                    ✓ Zero API tokens · No rate limits · Instant generation
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 10, color: 'var(--sidebar-muted)' }}>
                    Uses selected AI provider &amp; model
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Version ── */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <p style={{ fontSize: 10, color: 'var(--sidebar-muted)', textAlign: 'center' }}>
            QA Nexus FW v2.0 · Multi-Provider AI
          </p>
        </div>
      </div>
    </div>
  )
}
