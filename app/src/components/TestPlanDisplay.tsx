import ReactMarkdown from 'react-markdown'
import { exportTestPlanAsPDF, exportTestPlanAsDocx, exportAsMarkdown, copyToClipboard } from '../services/exportService'
import { useState } from 'react'

interface TestPlanDisplayProps {
  content: string
  jiraId: string
  provider: string
}

const TEST_PLAN_SECTIONS = [
  { id: '1', label: 'Scope',       color: '#6366f1', desc: 'In-scope & out-of-scope' },
  { id: '2', label: 'Strategy',    color: '#8b5cf6', desc: 'Test types & justifications' },
  { id: '3', label: 'Environment', color: '#06b6d4', desc: 'Hardware, software & tools' },
  { id: '4', label: 'Criteria',    color: '#10b981', desc: 'Entry & exit conditions' },
  { id: '5', label: 'Deliverables',color: '#f59e0b', desc: 'QA artifacts & severity' },
  { id: '6', label: 'Risks',       color: '#ef4444', desc: 'Assessments & mitigations' },
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
      {/* Test Plan Framework Banner */}
      <div className="rice-pot-banner">
        <div className="rice-pot-banner-title">
          <span className="rice-pot-label">PLAN</span>
          <span className="rice-pot-subtitle">Standard QA Test Plan Framework</span>
        </div>
        <div className="rice-pot-pills" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {TEST_PLAN_SECTIONS.map(s => (
            <div key={s.id} className="rice-pot-pill" style={{ '--pill-color': s.color } as React.CSSProperties}>
              <span className="rice-pot-pill-letter">{s.id}</span>
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
            <span className="strategy-card-badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>Professional</span>
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
