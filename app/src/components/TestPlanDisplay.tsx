import ReactMarkdown from 'react-markdown'
import { exportTestPlanAsPDF, exportTestPlanAsDocx, exportAsMarkdown, copyToClipboard } from '../services/exportService'
import { useState } from 'react'

interface TestPlanDisplayProps {
  content: string
  jiraId: string
  provider: string
}

const RICE_POT_SECTIONS = [
  { letter: 'R', label: 'Requirements', color: '#ef4444', desc: 'Functional & non-functional' },
  { letter: 'I', label: 'Interfaces',   color: '#f97316', desc: 'APIs, UI, integrations' },
  { letter: 'C', label: 'Components',   color: '#eab308', desc: 'System & integration deps' },
  { letter: 'E', label: 'Environment',  color: '#22c55e', desc: 'Env matrix & test data' },
  { letter: 'P', label: 'Procedures',   color: '#06b6d4', desc: 'Entry/exit criteria' },
  { letter: 'O', label: 'Operations',   color: '#6366f1', desc: 'Team, schedule, risks' },
  { letter: 'T', label: 'Traceability', color: '#a855f7', desc: 'Requirements ↔ test mapping' },
]

const providerLabels: Record<string, string> = {
  groq: '⚡ Groq', openrouter: '🔀 OpenRouter', gemini: '💎 Gemini', openai: '🤖 OpenAI'
}

export default function TestPlanDisplay({ content, jiraId, provider }: TestPlanDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(content)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handlePDF = async () => {
    setExportingPdf(true)
    try { exportTestPlanAsPDF(content, jiraId) }
    finally { setTimeout(() => setExportingPdf(false), 1500) }
  }

  const handleDocx = async () => {
    setExportingDocx(true)
    try { await exportTestPlanAsDocx(content, jiraId) }
    finally { setExportingDocx(false) }
  }

  return (
    <div className="animate-in">
      {/* RICE-POT Framework Banner */}
      <div className="rice-pot-banner">
        <div className="rice-pot-banner-title">
          <span className="rice-pot-label">RICE-POT</span>
          <span className="rice-pot-subtitle">IEEE 829 Test Plan Framework</span>
        </div>
        <div className="rice-pot-pills">
          {RICE_POT_SECTIONS.map(s => (
            <div key={s.letter} className="rice-pot-pill" style={{ '--pill-color': s.color } as React.CSSProperties}>
              <span className="rice-pot-pill-letter">{s.letter}</span>
              <div className="rice-pot-pill-info">
                <span className="rice-pot-pill-name">{s.label}</span>
                <span className="rice-pot-pill-desc">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Plan Card */}
      <div className="strategy-card" style={{ marginTop: 16 }}>
        <div className="strategy-card-header">
          <div className="strategy-card-title">
            📋 {jiraId} – Test Plan
            <span className="strategy-card-badge">{providerLabels[provider] || provider}</span>
            <span className="strategy-card-badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>RICE-POT</span>
          </div>
        </div>
        <div className="strategy-content">
          <div className="markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Export Bar */}
      <div className="export-bar">
        <button className="btn-export" onClick={handleCopy}>
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
        <button className="btn-export btn-export-accent" onClick={handlePDF} disabled={exportingPdf}>
          {exportingPdf ? '⏳ Generating…' : '📄 Export PDF'}
        </button>
        <button className="btn-export btn-export-purple" onClick={handleDocx} disabled={exportingDocx}>
          {exportingDocx ? '⏳ Generating…' : '📝 Export DOCX'}
        </button>
        <button className="btn-export" onClick={() => exportAsMarkdown(content, jiraId, 'plan')}>
          ⬇️ Markdown
        </button>
      </div>
    </div>
  )
}
