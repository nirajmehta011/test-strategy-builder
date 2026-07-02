import { useState } from 'react'
import type { TestCase } from '../services/aiService'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001/api' : '/api')

export type GenerationMode = 'strategy' | 'plan' | 'cases' | 'automate_csv' | 'workflow'

export interface GenerationInput {
  source: 'jira' | 'url' | 'doc' | 'visual'
  jiraId?: string
  url?: string
  docName?: string
  docText?: string
  visualType?: 'video' | 'screenshot' | 'figma'
  mediaFiles?: { mimeType: string; base64: string; name: string }[]
  figmaUrl?: string
  figmaToken?: string
  scopeOption?: 'specific' | 'all'
  focusArea?: string
  videoAnalysisMode?: 'frames' | 'direct'
  rawVideoFiles?: { mimeType: string; base64: string; name: string }[]
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
  const [inputSource, setInputSource] = useState<'jira' | 'url' | 'doc' | 'visual'>('jira')
  const [selectedMode, setSelectedMode] = useState<GenerationMode>(activeMode)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // File Upload State for Automate Any Cases
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // Visual spec inputs
  const [visualFiles, setVisualFiles] = useState<{ file: File; base64: string }[]>([])
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaToken, setFigmaToken] = useState(localStorage.getItem('figma_pat') || '')
  const [figmaLoading, setFigmaLoading] = useState(false)
  const [figmaError, setFigmaError] = useState<string | null>(null)
  const [figmaStatus, setFigmaStatus] = useState<string | null>(null)
  const [scopeOption, setScopeOption] = useState<'specific' | 'all'>('all')
  const [focusArea, setFocusArea] = useState('')
  const [extractingVideo, setExtractingVideo] = useState(false)
  // Video analysis mode: 'frames' = extract screenshots (default), 'direct' = send raw video base64
  const [videoAnalysisMode, setVideoAnalysisMode] = useState<'frames' | 'direct'>('frames')
  // Raw video files for direct video mode (not frame-extracted)
  const [rawVideoFiles, setRawVideoFiles] = useState<{ file: File; base64: string; mimeType: string }[]>([])

  const extractFramesFromVideo = (file: File): Promise<{ name: string; base64: string; mimeType: string }[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      
      const objectUrl = URL.createObjectURL(file)
      video.src = objectUrl

      video.onloadedmetadata = () => {
        const duration = video.duration
        if (isNaN(duration) || duration <= 0) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Invalid video duration.'))
          return
        }

        // Dynamically sample: sample every 1.5 - 2 seconds, but at least 15 samples and at most 60 samples
        const sampleCount = Math.min(60, Math.max(15, Math.floor(duration / 1.5)))
        const maxSavedFrames = 22 // Cap to prevent Request Entity Too Large errors
        const threshold = 0.055 // 5.5% pixel change threshold for layout changes
        const frames: { name: string; base64: string; mimeType: string }[] = []
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Small offscreen canvas for fast pixel diffing
        const diffCanvas = document.createElement('canvas')
        diffCanvas.width = 160
        diffCanvas.height = 90
        const diffCtx = diffCanvas.getContext('2d')
        
        let lastSavedImgData: ImageData | null = null
        let sampleIndex = 0

        // Helper to compute absolute average difference between two frames
        const getFrameDifference = (imgData1: ImageData, imgData2: ImageData): number => {
          const data1 = imgData1.data
          const data2 = imgData2.data
          let diffSum = 0
          let count = 0
          const len = data1.length
          // Sample every 4th pixel (step by 16 in the RGBA flat array) for speed
          for (let i = 0; i < len; i += 16) {
            diffSum += Math.abs(data1[i] - data2[i])     // Red
            diffSum += Math.abs(data1[i+1] - data2[i+1]) // Green
            diffSum += Math.abs(data1[i+2] - data2[i+2]) // Blue
            count += 3
          }
          return diffSum / (count * 255)
        }

        // We want to guarantee we get a good baseline (e.g. at least 6 spread out frames)
        const regularSampleInterval = Math.max(1, Math.floor(sampleCount / 6))

        const seekAndCapture = () => {
          // If we reached the end of samples or we hit the cap
          if (sampleIndex >= sampleCount || frames.length >= maxSavedFrames) {
            URL.revokeObjectURL(objectUrl)
            resolve(frames)
            return
          }

          // Seek to the next timestamp
          const seekTime = (duration / (sampleCount - 1)) * sampleIndex
          video.currentTime = seekTime
        }

        video.onseeked = () => {
          if (ctx && diffCtx) {
            // Draw onto the small canvas for comparison
            diffCtx.drawImage(video, 0, 0, 160, 90)
            const currentImgData = diffCtx.getImageData(0, 0, 160, 90)
            
            let shouldSave = false
            
            // 1. Always save the very first frame for context
            if (sampleIndex === 0) {
              shouldSave = true
            } 
            // 2. Always save the very last frame to guarantee the ending state is covered
            else if (sampleIndex === sampleCount - 1) {
              shouldSave = true
              // If we are at the limit, pop the second-to-last frame so we don't exceed maxSavedFrames
              if (frames.length >= maxSavedFrames && frames.length > 1) {
                frames.pop()
              }
            } 
            // 3. Save regular intervals to guarantee baseline coverage
            else if (sampleIndex % regularSampleInterval === 0) {
              shouldSave = true
            } 
            // 4. Save if there is a significant layout/UI change (> 5.5% difference)
            else if (lastSavedImgData) {
              const diff = getFrameDifference(currentImgData, lastSavedImgData)
              if (diff > threshold) {
                shouldSave = true
              }
            }

            if (shouldSave) {
              // Extract high-quality frame
              const maxDim = 1280
              let w = video.videoWidth || 640
              let h = video.videoHeight || 360
              
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w)
                  w = maxDim
                } else {
                  w = Math.round((w * maxDim) / h)
                  h = maxDim
                }
              }

              canvas.width = w
              canvas.height = h
              ctx.drawImage(video, 0, 0, w, h)
              
              const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
              const base64 = dataUrl.split(',')[1] || ''
              
              frames.push({
                name: `${file.name.replace(/\.[^/.]+$/, '')}_frame_${frames.length + 1}.jpg`,
                base64,
                mimeType: 'image/jpeg'
              })
              
              lastSavedImgData = currentImgData
            }
          }

          sampleIndex++
          seekAndCapture()
        }

        video.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Failed to process video frames.'))
        }

        seekAndCapture()
      }

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to load video file.'))
      }
    })
  }

  const readVideoAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(((e.target?.result as string) || '').split(',')[1] || '')
      reader.onerror = () => reject(new Error('Failed to read video file.'))
      reader.readAsDataURL(file)
    })
  }

  const handleVisualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setValidationError(null)
      const fileList = Array.from(files)
      
      for (const file of fileList) {
        if (file.type.startsWith('video/')) {
          if (videoAnalysisMode === 'direct') {
            // Direct mode: store raw video as base64, no frame extraction
            try {
              const base64 = await readVideoAsBase64(file)
              setRawVideoFiles(prev => [...prev, { file, base64, mimeType: file.type || 'video/mp4' }])
            } catch (err: any) {
              setValidationError(`Failed to read video file: ${err.message}`)
            }
          } else {
            // Frames mode: existing frame extraction
            setExtractingVideo(true)
            try {
              const frames = await extractFramesFromVideo(file)
              setVisualFiles(prev => [
                ...prev,
                ...frames.map(f => ({
                  file: new File([], f.name, { type: f.mimeType }),
                  base64: f.base64
                }))
              ])
            } catch (err: any) {
              setValidationError(`Failed to extract frames from video: ${err.message}`)
            } finally {
              setExtractingVideo(false)
            }
          }
        } else {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(',')[1] || ''
            setVisualFiles(prev => [...prev, { file, base64 }])
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  const handleFetchFigma = async () => {
    if (!figmaUrl) {
      setFigmaError('Please enter a Figma File URL')
      return
    }
    const token = figmaToken || localStorage.getItem('figma_pat') || ''
    if (!token) {
      setFigmaError('Please enter a Figma Personal Access Token')
      return
    }
    localStorage.setItem('figma_pat', token)
    setFigmaLoading(true)
    setFigmaError(null)
    setFigmaStatus(null)

    try {
      const response = await fetch(`${API_BASE}/figma/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: figmaUrl, accessToken: token })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to fetch from Figma')
      }

      const data = await response.json()
      
      if (data.images && data.images.length > 0) {
        const newVisuals = data.images.map((img: any, idx: number) => {
          const dummyFile = new File([], `Figma Frame ${img.nodeId || idx + 1}.png`, { type: img.mimeType })
          return {
            file: dummyFile,
            base64: img.base64
          }
        })
        setVisualFiles(prev => [...prev, ...newVisuals])
        setFigmaStatus(`Successfully fetched ${data.images.length} frames from Figma file "${data.fileName}"!`)
        setFigmaUrl('')
      } else {
        setFigmaError('No exportable frames found in the file.')
      }
    } catch (err: any) {
      setFigmaError(err.message || 'Error connecting to Figma API')
    } finally {
      setFigmaLoading(false)
    }
  }

  const handleVisualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hasFrames = visualFiles.length > 0
    const hasRawVideo = rawVideoFiles.length > 0
    if (!hasFrames && !hasRawVideo && !figmaUrl) {
      setValidationError('Please upload at least one screenshot/video or fetch frames from Figma.')
      return
    }
    if (scopeOption === 'specific' && !focusArea.trim()) {
      setValidationError('Please specify details for the specific feature you want to test.')
      return
    }
    setValidationError(null)

    const mediaFiles = visualFiles.map(vf => ({
      mimeType: vf.file.type,
      base64: vf.base64,
      name: vf.file.name
    }))

    onGenerate({
      source: 'visual',
      mediaFiles,
      scopeOption,
      focusArea: focusArea.trim(),
      figmaUrl: figmaUrl.trim() || undefined,
      figmaToken: figmaToken.trim() || undefined,
      videoAnalysisMode,
      rawVideoFiles: rawVideoFiles.length > 0
        ? rawVideoFiles.map(rv => ({ mimeType: rv.mimeType, base64: rv.base64, name: rv.file.name }))
        : undefined
    }, selectedMode)
  }

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
          <div className="input-source-selector">
            <button
              type="button"
              className={`source-tab-btn ${inputSource === 'jira' ? 'active' : ''}`}
              style={inputSource === 'jira' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('jira'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="source-tab-icon">🎫</span>
              <span className="source-tab-label">Jira Ticket</span>
            </button>
            <button
              type="button"
              className={`source-tab-btn ${inputSource === 'url' ? 'active' : ''}`}
              style={inputSource === 'url' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('url'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="source-tab-icon">🌐</span>
              <span className="source-tab-label">Website URL</span>
            </button>
            <button
              type="button"
              className={`source-tab-btn ${inputSource === 'doc' ? 'active' : ''}`}
              style={inputSource === 'doc' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('doc'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="source-tab-icon">📄</span>
              <span className="source-tab-label">Spec Document</span>
            </button>
            <button
              type="button"
              className={`source-tab-btn ${inputSource === 'visual' ? 'active' : ''}`}
              style={inputSource === 'visual' ? { '--mode-color': activeInfo.color } as React.CSSProperties : {}}
              onClick={() => { setInputSource('visual'); setValidationError(null) }}
              disabled={loading}
            >
              <span className="source-tab-icon">📸</span>
              <span className="source-tab-label">Visual / Video Spec</span>
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

          {inputSource === 'visual' && (
            <div className="csv-upload-wrapper animate-in" style={{ textAlign: 'left', padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '16px' }}>
                
                {/* Upload Zone */}
                <div>
                  <label className="jira-input-label" style={{ marginBottom: 8, display: 'block' }}>
                    Upload Screenshots or Video walkthrough
                    <span className="jira-input-mode-tag" style={{ backgroundColor: `${activeInfo.color}20`, color: activeInfo.color, marginLeft: 8 }}>
                      📸 visual files
                    </span>
                  </label>
                  
                  {/* ── Video Analysis Mode Toggle ── */}
                  <div style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Video Analysis Mode</div>
                    <div style={{ display: 'flex', gap: 6, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoAnalysisMode('frames')
                          setRawVideoFiles([])
                          setValidationError(null)
                        }}
                        disabled={loading}
                        style={{
                          flex: 1, padding: '7px 6px', border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                          background: videoAnalysisMode === 'frames' ? 'var(--accent)' : 'transparent',
                          color: videoAnalysisMode === 'frames' ? '#fff' : 'var(--sidebar-muted)',
                        }}
                      >
                        🎞️ Frame-by-Frame
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoAnalysisMode('direct')
                          setVisualFiles(prev => prev.filter(vf => !vf.file.name.includes('_frame_')))
                          setValidationError(null)
                        }}
                        disabled={loading}
                        style={{
                          flex: 1, padding: '7px 6px', border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                          background: videoAnalysisMode === 'direct' ? '#7c3aed' : 'transparent',
                          color: videoAnalysisMode === 'direct' ? '#fff' : 'var(--sidebar-muted)',
                        }}
                      >
                        🎬 Direct Video
                      </button>
                    </div>
                    <div style={{ marginTop: 7, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {videoAnalysisMode === 'frames'
                        ? '🎞️ Extracts key screenshots from video — works with all vision models (OpenAI, Claude, Gemini)'
                        : '🎬 Sends the full video natively — best with Gemini 1.5/2.0 · no frame-limit · captures all UI transitions'}
                    </div>
                    {videoAnalysisMode === 'direct' && (
                      <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(124,58,237,0.1)', borderRadius: 4, fontSize: 10, color: '#a78bfa' }}>
                        ⚡ Also works with <b>Smart Rules Mode</b> — generates all cases from video metadata, zero API tokens
                      </div>
                    )}
                  </div>

                  {extractingVideo ? (
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '24px 16px', 
                        background: 'rgba(99, 102, 241, 0.05)', 
                        border: '1px dashed rgba(99, 102, 241, 0.3)', 
                        borderRadius: 8, 
                        textAlign: 'center',
                        color: 'var(--accent)',
                        minHeight: 110
                      }}
                    >
                      <span className="btn-spinner" style={{ borderLeftColor: 'var(--accent)', width: 24, height: 24, marginBottom: 12 }} />
                      <span style={{ fontSize: 13, fontWeight: 'bold' }}>🎞️ Extracting video frames...</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Optimizing visual specification layout steps</span>
                    </div>
                  ) : (
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
                        cursor: loading || extractingVideo ? 'not-allowed' : 'pointer', 
                        transition: 'var(--transition)',
                        opacity: loading || extractingVideo ? 0.6 : 1,
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: 28, marginBottom: 8 }}>{videoAnalysisMode === 'direct' ? '🎬' : '🎞️'}</span>
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {videoAnalysisMode === 'direct' ? 'Click to upload video for direct analysis' : 'Click to upload screenshot or feature video'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {videoAnalysisMode === 'direct' ? 'Accepts MP4, WEBM, MOV (up to 50MB) — sent natively to Gemini' : 'Accepts MP4, WEBM, PNG, JPG, JPEG'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleVisualFileChange}
                        disabled={loading || extractingVideo}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                  
                  {/* Direct video file list */}
                  {rawVideoFiles.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold', color: '#a78bfa' }}>🎬 Direct Video Files ({rawVideoFiles.length}):</span>
                      {rawVideoFiles.map((rv, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6, padding: '7px 12px', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 18 }}>🎬</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{rv.file.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round(rv.file.size / 1024 / 1024 * 10) / 10} MB · {rv.mimeType}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRawVideoFiles(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Extracted frame thumbnails */}
                  {visualFiles.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)' }}>Uploaded Assets ({visualFiles.length}):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
                        {visualFiles.map((vf, index) => {
                          const isVideo = vf.file.type.startsWith('video/') || vf.file.name.endsWith('.mp4') || vf.file.name.endsWith('.mov') || vf.file.name.endsWith('.webm')
                          return (
                            <div key={index} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', background: '#111' }}>
                              {isVideo ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                  📹
                                  <span style={{ fontSize: 7, color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '60px', textAlign: 'center' }}>{vf.file.name}</span>
                                </div>
                              ) : (
                                <img src={`data:${vf.file.type || 'image/png'};base64,${vf.base64}`} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              <button
                                type="button"
                                onClick={() => setVisualFiles(prev => prev.filter((_, i) => i !== index))}
                                style={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  background: 'rgba(239, 68, 68, 0.85)',
                                  border: 'none',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: 14,
                                  height: 14,
                                  fontSize: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>


                {/* Figma importer */}
                <div>
                  <label className="jira-input-label" style={{ marginBottom: 8, display: 'block' }}>
                    Connect to Figma mockups
                    <span className="jira-input-mode-tag" style={{ backgroundColor: 'rgba(242, 78, 30, 0.15)', color: '#F24E1E', marginLeft: 8 }}>
                      ❖ Figma Sync
                    </span>
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="url"
                      value={figmaUrl}
                      onChange={e => { setFigmaUrl(e.target.value); setFigmaError(null); }}
                      placeholder="e.g., https://www.figma.com/design/FILE_KEY/..."
                      className="field-input"
                      style={{ fontSize: 12, padding: '8px 12px', width: '100%' }}
                      disabled={loading || figmaLoading}
                    />
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        value={figmaToken}
                        onChange={e => { setFigmaToken(e.target.value); setFigmaError(null); }}
                        placeholder="Figma Personal Access Token..."
                        className="field-input"
                        style={{ fontSize: 12, padding: '8px 12px', flex: 1 }}
                        disabled={loading || figmaLoading}
                      />
                      <button
                        type="button"
                        onClick={handleFetchFigma}
                        disabled={loading || figmaLoading || !figmaUrl}
                        className="btn-sidebar btn-sidebar-primary"
                        style={{ margin: 0, padding: '0 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, height: 36, whiteSpace: 'nowrap' }}
                      >
                        {figmaLoading ? '⏳ Fetching...' : '❖ Fetch Frames'}
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a
                        href="https://www.figma.com/settings/developer"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        Get Figma personal access token ↗
                      </a>
                    </div>

                    {figmaError && (
                      <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0 0' }}>⚠️ {figmaError}</p>
                    )}
                    
                    {figmaStatus && (
                      <p style={{ fontSize: 11, color: '#10b981', margin: '4px 0 0 0' }}>✓ {figmaStatus}</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Feature scope configuration */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <label className="jira-input-label" style={{ marginBottom: 8, display: 'block' }}>
                  Feature scope focus
                </label>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scopeOption"
                      checked={scopeOption === 'all'}
                      onChange={() => { setScopeOption('all'); setValidationError(null); }}
                      disabled={loading}
                    />
                    Generate all possible cases about all features
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scopeOption"
                      checked={scopeOption === 'specific'}
                      onChange={() => { setScopeOption('specific'); setValidationError(null); }}
                      disabled={loading}
                    />
                    Limit to a specific feature only
                  </label>
                </div>

                {scopeOption === 'specific' ? (
                  <div className="animate-in" style={{ marginTop: 12 }}>
                    <label className="field-label" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, display: 'block', fontWeight: 600 }}>
                      Specific Feature Details (Required)
                    </label>
                    <input
                      type="text"
                      value={focusArea}
                      onChange={e => { setFocusArea(e.target.value); setValidationError(null); }}
                      placeholder="e.g., Billing form validation, user registration flow, password reset steps"
                      className="field-input"
                      style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
                      disabled={loading}
                      required
                    />
                  </div>
                ) : (
                  <div className="animate-in" style={{ marginTop: 12 }}>
                    <label className="field-label" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                      Additional Context / Instructions (Optional)
                    </label>
                    <textarea
                      value={focusArea}
                      onChange={e => { setFocusArea(e.target.value); setValidationError(null); }}
                      placeholder="Focus on edge cases and field validation rules visible in the frames..."
                      className="field-input"
                      style={{ width: '100%', height: 60, minHeight: 60, fontSize: 12, padding: '8px 12px', resize: 'vertical' }}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              {validationError && (
                <p className="jira-input-error" style={{ marginBottom: 12 }}>⚠️ {validationError}</p>
              )}

              <button
                type="button"
                onClick={handleVisualSubmit}
                disabled={loading || (visualFiles.length === 0 && !figmaUrl)}
                className="btn-primary btn-generate"
                style={{ 
                  width: '100%', 
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
                    Analyzing Visual Spec...
                  </>
                ) : (
                  <>{activeInfo.icon} Generate from Visual Spec</>
                )}
              </button>
              
              <p className="jira-input-hint" style={{ marginTop: 8 }}>
                💡 <b>Note on Video Analysis:</b> Perform frame-by-frame analysis of feature steps. Native video uploads are recommended with <b>Gemini 1.5/2.0</b> models.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

