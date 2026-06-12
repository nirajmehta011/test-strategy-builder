import { useState } from 'react'
import type { TestCase } from '../services/aiService'

export type GenerationMode = 'strategy' | 'plan' | 'cases' | 'automate_csv' | 'workflow'

export interface GenerationInput {
  source: 'jira' | 'url' | 'doc'
  jiraId?: string
  url?: string
  docName?: string
  docText?: string
}

interface JiraIDInputProps {
  onGenerate: (input: GenerationInput, mode: GenerationMode) => Promise<void>
  onAutomateFile?: (fileData: { cases?: TestCase[], pdfText?: string }, fileName: string) => Promise<void>
  loading: boolean
  activeMode: GenerationMode
}

const MODES: { id: GenerationMode; icon: string; label: string; sublabel: string; color: string }[] = [
  { id: 'strategy',     icon: '🎯', label: 'Test Strategy', sublabel: 'Risk-based QA approach', color: '#6366f1' },
  { id: 'plan',         icon: '📋', label: 'Test Plan',     sublabel: 'RICE-POT framework',      color: '#8b5cf6' },
  { id: 'cases',        icon: '🧪', label: 'Test Cases',    sublabel: 'Jira/Zephyr format',      color: '#06b6d4' },
  { id: 'automate_csv', icon: '🤖', label: 'Automate Any Cases', sublabel: 'Playwright from CSV/Excel/PDF', color: '#10b981' },
  { id: 'workflow',     icon: '⚡', label: 'Full QA Flow',   sublabel: 'Run complete QA pipeline', color: '#f59e0b' },
]

export default function JiraIDInput({ onGenerate, onAutomateFile, loading, activeMode }: JiraIDInputProps) {
  const [jiraId, setJiraId] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [inputSource, setInputSource] = useState<'jira' | 'url' | 'doc'>('jira')
  const [selectedMode, setSelectedMode] = useState<GenerationMode>(activeMode)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // File Upload State for Automate Any Cases
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = jiraId.trim().toUpperCase()
    if (!trimmed) { setValidationError('Please enter a Jira Issue ID'); return }
    if (!trimmed.includes('-')) { setValidationError('Format: PROJECT-123 (e.g., SCRUM-6)'); return }
    setValidationError(null)
    onGenerate({ source: 'jira', jiraId: trimmed }, selectedMode)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = webUrl.trim()
    if (!trimmed) { setValidationError('Please enter a website URL'); return }
    if (!/^https?:\/\/\S+$/i.test(trimmed)) { setValidationError('Please enter a valid URL (e.g. https://example.com)'); return }
    setValidationError(null)
    onGenerate({ source: 'url', url: trimmed }, selectedMode)
  }

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocFile(file)
      setValidationError(null)
    }
  }

  const handleClearDoc = () => {
    setDocFile(null)
  }

  const handleDocSubmit = async () => {
    if (!docFile) return
    const file = docFile
    const isPDF = file.name.toLowerCase().endsWith('.pdf')
    const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')
    const isText = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')

    if (isPDF) {
      try {
        const { parsePDFToText } = await import('../services/exportService')
        const text = await parsePDFToText(file)
        if (!text || !text.trim()) {
          setValidationError('No readable text found in PDF.')
          return
        }
        setValidationError(null)
        await onGenerate({ source: 'doc', docName: file.name, docText: text }, selectedMode)
      } catch (err: any) {
        setValidationError(err.message || 'Failed to extract text from PDF.')
      }
    } else if (isDocx) {
      try {
        const { parseDocxToText } = await import('../services/exportService')
        const text = await parseDocxToText(file)
        if (!text || !text.trim()) {
          setValidationError('No readable text found in Word document.')
          return
        }
        setValidationError(null)
        await onGenerate({ source: 'doc', docName: file.name, docText: text }, selectedMode)
      } catch (err: any) {
        setValidationError(err.message || 'Failed to parse Word document.')
      }
    } else if (isText) {
      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string
            if (!text || !text.trim()) {
              setValidationError('File is empty.')
              return
            }
            setValidationError(null)
            await onGenerate({ source: 'doc', docName: file.name, docText: text }, selectedMode)
          } catch (err: any) {
            setValidationError(err.message || 'Failed to read text file.')
          }
        }
        reader.readAsText(file)
      } catch (err: any) {
        setValidationError(err.message || 'Failed to read file.')
      }
    } else {
      setValidationError('Unsupported file format. Please upload a TXT, MD, PDF, or DOCX file.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      setValidationError(null)
    }
  }

  const handleClearCSV = () => {
    setCsvFile(null)
  }

  const handleCSVSubmit = async () => {
    if (!csvFile) return
    const file = csvFile
    const isPDF = file.name.toLowerCase().endsWith('.pdf')
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')

    if (isPDF) {
      try {
        const { parsePDFToText } = await import('../services/exportService')
        const text = await parsePDFToText(file)
        if (!text || !text.trim()) {
          setValidationError('No readable text found in PDF. Note that scanned PDFs (images) are not supported.')
          return
        }
        setValidationError(null)
        if (onAutomateFile) {
          await onAutomateFile({ pdfText: text }, file.name)
        }
      } catch (err: any) {
        setValidationError(err.message || 'Failed to extract text from PDF.')
      }
    } else if (isExcel) {
      try {
        const { parseExcelToCSV, parseCSVToTestCases } = await import('../services/exportService')
        const csvText = await parseExcelToCSV(file)
        const cases = parseCSVToTestCases(csvText)
        if (cases.length === 0) {
          setValidationError('No valid test cases found in Excel sheet. Please verify column headers.')
          return
        }
        setValidationError(null)
        if (onAutomateFile) {
          await onAutomateFile({ cases }, file.name)
        }
      } catch (err: any) {
        setValidationError(err.message || 'Failed to parse Excel file.')
      }
    } else {
      try {
        const { parseCSVToTestCases } = await import('../services/exportService')
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string
            const cases = parseCSVToTestCases(text)
            if (cases.length === 0) {
               setValidationError('No valid test cases found in the CSV file. Please verify that the CSV contains at least a column mapping to the test case summary or name.')
              return
            }
            setValidationError(null)
            if (onAutomateFile) {
              await onAutomateFile({ cases }, file.name)
            }
          } catch (err: any) {
            setValidationError(err.message || 'Failed to parse CSV file.')
          }
        }
        reader.readAsText(file)
      } catch (err: any) {
        setValidationError(err.message || 'Failed to parse file.')
      }
    }
  }

  const activeInfo = MODES.find(m => m.id === selectedMode)!

  return (
    <div className="jira-input-card">
      {/* Mode Selector */}
      <div className="mode-selector" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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

      {selectedMode === 'automate_csv' ? (
        <div className="csv-upload-wrapper animate-in" style={{ padding: '8px 0' }}>
          <label className="jira-input-label" style={{ marginBottom: 8, display: 'block', textAlign: 'left' }}>
            Upload Test Cases File
          </label>
          <label 
            className="csv-upload-label" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '24px 16px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px dashed rgba(255, 255, 255, 0.12)', 
              borderRadius: 8, 
              cursor: loading ? 'not-allowed' : 'pointer', 
              transition: 'var(--transition)',
              opacity: loading ? 0.6 : 1
            }}
          >
            <span style={{ fontSize: 28, marginBottom: 8 }}>📥</span>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>Click to upload CSV, Excel, or PDF file</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Supports standard table formats (CSV/Excel) and text test documents (PDF)</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls, .pdf"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>

          {csvFile && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>📄 {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</span>
              <button
                type="button"
                onClick={handleClearCSV}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          )}

          {validationError && (
            <p className="jira-input-error" style={{ marginTop: 8, textAlign: 'left' }}>⚠️ {validationError}</p>
          )}

          {csvFile && (
            <button
              type="button"
              onClick={handleCSVSubmit}
              disabled={loading}
              className="btn-primary btn-generate"
              style={{ 
                width: '100%', 
                marginTop: 16, 
                padding: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8,
                borderRadius: 8,
                fontWeight: 'bold',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Parsing & Automating...
                </>
              ) : (
                <>🤖 Automate Any Cases</>
              )}
            </button>
          )}
        </div>
      ) : (
        /* Multi-Input Source block */
        <div>
          {/* Input Source Tabs */}
          <div className="input-source-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`mode-btn ${inputSource === 'jira' ? 'active' : ''}`}
              style={inputSource === 'jira' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('jira'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="mode-btn-icon">🎫</span>
              <div className="mode-btn-text">
                <span className="mode-btn-label">Jira Ticket</span>
                <span className="mode-btn-sub">Fetch issue key</span>
              </div>
            </button>
            <button
              type="button"
              className={`mode-btn ${inputSource === 'url' ? 'active' : ''}`}
              style={inputSource === 'url' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('url'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="mode-btn-icon">🌐</span>
              <div className="mode-btn-text">
                <span className="mode-btn-label">Website URL</span>
                <span className="mode-btn-sub">Scrape site content</span>
              </div>
            </button>
            <button
              type="button"
              className={`mode-btn ${inputSource === 'doc' ? 'active' : ''}`}
              style={inputSource === 'doc' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('doc'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="mode-btn-icon">📄</span>
              <div className="mode-btn-text">
                <span className="mode-btn-label">Spec Document</span>
                <span className="mode-btn-sub">TXT, MD, PDF, DOCX</span>
              </div>
            </button>
          </div>

          {/* Render Active Source Form */}
          {inputSource === 'jira' && (
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
          )}

          {inputSource === 'url' && (
            <form onSubmit={handleUrlSubmit}>
              <label className="jira-input-label">
                Website URL
                <span className="jira-input-mode-tag" style={{ backgroundColor: `${activeInfo.color}20`, color: activeInfo.color }}>
                  🌐 {activeInfo.label}
                </span>
              </label>

              <div className="jira-input-wrapper">
                <input
                  id="url-input"
                  type="url"
                  value={webUrl}
                  onChange={e => { setWebUrl(e.target.value); setValidationError(null) }}
                  placeholder="e.g., https://example.com/pricing"
                  className="jira-input"
                  disabled={loading}
                  autoFocus
                />

                <button
                  id="generate-url-btn"
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
                Scrapes webpage text content to generate {activeInfo.label} via selected AI provider
              </p>
            </form>
          )}

          {inputSource === 'doc' && (
            <div className="csv-upload-wrapper animate-in" style={{ padding: '8px 0' }}>
              <label className="jira-input-label" style={{ marginBottom: 8, display: 'block', textAlign: 'left' }}>
                Upload Specification Document
                <span className="jira-input-mode-tag" style={{ backgroundColor: `${activeInfo.color}20`, color: activeInfo.color, marginLeft: 8 }}>
                  📄 {activeInfo.label}
                </span>
              </label>
              <label 
                className="csv-upload-label" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '24px 16px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px dashed rgba(255, 255, 255, 0.12)', 
                  borderRadius: 8, 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  transition: 'var(--transition)',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <span style={{ fontSize: 28, marginBottom: 8 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>Click to upload TXT, MD, PDF, or DOCX</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Supports text spec, markdown docs, PDF spec sheets, or Word documents</span>
                <input
                  type="file"
                  accept=".txt, .md, .pdf, .docx, .doc"
                  onChange={handleDocChange}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </label>

              {docFile && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 6, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>📄 {docFile.name} ({Math.round(docFile.size / 1024)} KB)</span>
                  <button
                    type="button"
                    onClick={handleClearDoc}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {validationError && (
                <p className="jira-input-error" style={{ marginTop: 8, textAlign: 'left' }}>⚠️ {validationError}</p>
              )}

              {docFile && (
                <button
                  type="button"
                  onClick={handleDocSubmit}
                  disabled={loading}
                  className="btn-primary btn-generate"
                  style={{ 
                    width: '100%', 
                    marginTop: 16, 
                    padding: '12px',
                    background: `linear-gradient(135deg, ${activeInfo.color}, ${activeInfo.color}cc)`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8,
                    borderRadius: 8,
                    fontWeight: 'bold',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" />
                      Parsing & Generating...
                    </>
                  ) : (
                    <>{activeInfo.icon} Generate from Document</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

