import { useState } from 'react'

export type GenerationMode = 'strategy' | 'plan' | 'cases'

interface JiraIDInputProps {
  onGenerate: (jiraId: string, mode: GenerationMode) => Promise<void>
  loading: boolean
  activeMode: GenerationMode
}

const MODES: { id: GenerationMode; icon: string; label: string; sublabel: string; color: string }[] = [
  { id: 'strategy', icon: '🎯', label: 'Test Strategy', sublabel: 'Risk-based QA approach', color: '#6366f1' },
  { id: 'plan',     icon: '📋', label: 'Test Plan',     sublabel: 'RICE-POT framework',      color: '#8b5cf6' },
  { id: 'cases',    icon: '🧪', label: 'Test Cases',    sublabel: 'Jira/Zephyr format',      color: '#06b6d4' },
]

export default function JiraIDInput({ onGenerate, loading, activeMode }: JiraIDInputProps) {
  const [jiraId, setJiraId] = useState('')
  const [selectedMode, setSelectedMode] = useState<GenerationMode>(activeMode)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = jiraId.trim().toUpperCase()
    if (!trimmed) { setValidationError('Please enter a Jira Issue ID'); return }
    if (!trimmed.includes('-')) { setValidationError('Format: PROJECT-123 (e.g., SCRUM-6)'); return }
    setValidationError(null)
    onGenerate(trimmed, selectedMode)
  }

  const activeInfo = MODES.find(m => m.id === selectedMode)!

  return (
    <div className="jira-input-card">
      {/* Mode Selector */}
      <div className="mode-selector">
        {MODES.map(mode => (
          <button
            key={mode.id}
            type="button"
            className={`mode-btn ${selectedMode === mode.id ? 'active' : ''}`}
            style={selectedMode === mode.id ? { '--mode-color': mode.color } as React.CSSProperties : {}}
            onClick={() => { setSelectedMode(mode.id); setValidationError(null) }}
            disabled={loading}
          >
            <span className="mode-btn-icon">{mode.icon}</span>
            <div className="mode-btn-text">
              <span className="mode-btn-label">{mode.label}</span>
              <span className="mode-btn-sub">{mode.sublabel}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit}>
        <label className="jira-input-label">
          Jira Issue ID
          <span className="jira-input-mode-tag" style={{ backgroundColor: `${activeInfo.color}20`, color: activeInfo.color }}>
            {activeInfo.icon} {activeInfo.label}
          </span>
        </label>

        <div className="jira-input-wrapper">
          <input
            id="jira-id-input"
            type="text"
            value={jiraId}
            onChange={e => { setJiraId(e.target.value); setValidationError(null) }}
            placeholder="e.g., SCRUM-6, PROJ-123, EPIC-42"
            className="jira-input"
            disabled={loading}
            autoFocus
          />

          <button
            id="generate-btn"
            type="submit"
            disabled={loading}
            className="btn-primary btn-generate"
            style={{ background: `linear-gradient(135deg, ${activeInfo.color}, ${activeInfo.color}cc)` }}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Generating…
              </>
            ) : (
              <>{activeInfo.icon} Generate</>
            )}
          </button>
        </div>

        {validationError && (
          <p className="jira-input-error">⚠️ {validationError}</p>
        )}

        <p className="jira-input-hint">
          Uses configured Jira credentials + {activeInfo.label} generation via selected AI provider
        </p>
      </form>
    </div>
  )
}
