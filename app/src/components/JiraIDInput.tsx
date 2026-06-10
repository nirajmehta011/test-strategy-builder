import { useState } from 'react'

interface JiraIDInputProps {
  onGenerate: (jiraId: string) => Promise<void>
  loading: boolean
}

export default function JiraIDInput({ onGenerate, loading }: JiraIDInputProps) {
  const [jiraId, setJiraId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = jiraId.trim().toUpperCase()

    if (!trimmed) {
      setValidationError('Please enter a Jira Issue ID')
      return
    }

    if (!trimmed.includes('-')) {
      setValidationError('Jira ID format: PROJECT-123 (e.g., SCRUM-6)')
      return
    }

    setValidationError(null)
    onGenerate(trimmed)
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <form onSubmit={handleSubmit}>
        <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          marginBottom: 10
        }}>
          Jira Issue ID
        </label>

        <div className="jira-input-wrapper">
          <input
            id="jira-id-input"
            type="text"
            value={jiraId}
            onChange={e => {
              setJiraId(e.target.value)
              setValidationError(null)
            }}
            placeholder="e.g., SCRUM-6, PROJ-123"
            className="jira-input"
            disabled={loading}
            autoFocus
          />

          <button
            id="generate-btn"
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block'
                }} />
                Generating
              </>
            ) : (
              <>⚡ Generate</>
            )}
          </button>
        </div>

        {validationError && (
          <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
            ⚠️ {validationError}
          </p>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
          Enter any Jira issue key accessible with your configured credentials
        </p>
      </form>
    </div>
  )
}
