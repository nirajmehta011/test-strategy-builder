import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ShadingType } from 'docx'
import JSZip from 'jszip'
import type { TestCase, PlaywrightAutomationData } from './aiService'


// ─── Markdown to Plain Text ───────────────────────────────────────────────────
function mdToPlain(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\|.*\|/g, '')
    .replace(/^[-|]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Parse markdown into structured sections
function parseMarkdownSections(md: string): { heading: string; level: number; content: string }[] {
  const lines = md.split('\n')
  const sections: { heading: string; level: number; content: string }[] = []
  let current: { heading: string; level: number; content: string } | null = null

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[2].trim(), level: headingMatch[1].length, content: '' }
    } else if (current) {
      current.content += line + '\n'
    }
  }
  if (current) sections.push(current)
  return sections
}

// ─── Copy to Clipboard ────────────────────────────────────────────────────────
export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false)
}

// ─── Export Strategy/Plan as Markdown ────────────────────────────────────────
export function exportAsMarkdown(content: string, jiraId: string, type: 'strategy' | 'plan' = 'strategy') {
  const el = document.createElement('a')
  el.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }))
  el.download = `${type === 'plan' ? 'test-plan' : 'test-strategy'}-${jiraId}.md`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Export as JSON ───────────────────────────────────────────────────────────
export function exportAsJSON(content: string, jiraId: string) {
  const data = { jira_id: jiraId, generated_at: new Date().toISOString(), format: 'markdown', content }
  const el = document.createElement('a')
  el.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  el.download = `test-strategy-${jiraId}.json`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Export Test Plan as PDF ──────────────────────────────────────────────────
export function exportTestPlanAsPDF(content: string, jiraId: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
    drawHeader()
    y += 10
  }

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 25) addPage()
  }

  const drawHeader = () => {
    doc.setFillColor(25, 28, 48)
    doc.rect(0, 0, pageW, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor(140, 145, 165)
    doc.text('QA NEXUS FRAMEWORK — RICE-POT TEST PLAN', margin, 8)
    doc.text(`${jiraId}  |  ${new Date().toLocaleDateString()}`, pageW - margin, 8, { align: 'right' })
  }

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(245, 247, 252)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('CONFIDENTIAL — QA Test Plan', margin, pageH - 5)
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  // Title page
  doc.setFillColor(25, 28, 48)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Gradient effect via overlays
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, pageW, 4, 'F')

  doc.setFontSize(9)
  doc.setTextColor(139, 92, 246)
  doc.setFont('helvetica', 'bold')
  doc.text('RICE-POT FRAMEWORK  ·  IEEE 829 COMPLIANT', pageW / 2, 55, { align: 'center' })

  doc.setFontSize(28)
  doc.setTextColor(241, 245, 249)
  doc.text('TEST PLAN', pageW / 2, 75, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(99, 102, 241)
  doc.text(jiraId, pageW / 2, 90, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW / 2, 105, { align: 'center' })
  doc.text('Prepared by QA Nexus Framework', pageW / 2, 113, { align: 'center' })

  // Version box
  doc.setFillColor(19, 22, 36)
  doc.roundedRect(margin + 30, 125, contentW - 60, 40, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Document Version: 1.0   |   Status: Draft   |   Classification: Internal', pageW / 2, 138, { align: 'center' })
  doc.text('Framework: RICE-POT (Requirements · Interfaces · Components · Environment · Procedures · Operations · Traceability)', pageW / 2, 148, { align: 'center', maxWidth: contentW - 60 })

  // Content pages
  doc.addPage()
  y = margin
  drawHeader()
  y = 18

  const sections = parseMarkdownSections(content)

  const RICE_POT_COLORS: Record<string, [number, number, number]> = {
    'R': [239, 68, 68],
    'I': [249, 115, 22],
    'C': [234, 179, 8],
    'E': [34, 197, 94],
    'P': [6, 182, 212],
    'O': [99, 102, 241],
    'T': [168, 85, 247],
  }

  for (const section of sections) {
    const text = mdToPlain(section.content)

    if (section.level === 1) {
      checkPage(25)
      doc.setFillColor(19, 22, 36)
      doc.rect(margin - 5, y - 2, contentW + 10, 18, 'F')
      doc.setFillColor(99, 102, 241)
      doc.rect(margin - 5, y - 2, 4, 18, 'F')
      doc.setFontSize(13)
      doc.setTextColor(241, 245, 249)
      doc.setFont('helvetica', 'bold')
      doc.text(section.heading, margin + 4, y + 10)
      y += 24

    } else if (section.level === 2) {
      checkPage(20)
      const letter = section.heading.match(/^([RICEPOT])\s/)?.[1] || ''
      const color = RICE_POT_COLORS[letter] || [99, 102, 241]
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(margin - 5, y, 3, 12, 'F')
      doc.setFillColor(...color.map(c => Math.min(c + 180, 255)) as [number,number,number])
      doc.rect(margin - 5, y, contentW + 10, 12, 'F')
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(margin - 5, y, 3, 12, 'F')
      doc.setFontSize(10)
      doc.setTextColor(25, 28, 48)
      doc.setFont('helvetica', 'bold')
      doc.text(section.heading, margin + 4, y + 8)
      y += 16

    } else if (section.level === 3) {
      checkPage(14)
      doc.setFontSize(9)
      doc.setTextColor(99, 102, 241)
      doc.setFont('helvetica', 'bold')
      doc.text(section.heading, margin, y + 6)
      y += 10

    } else {
      checkPage(8)
      doc.setFontSize(8)
      doc.setTextColor(51, 65, 85)
      doc.setFont('helvetica', 'normal')
      doc.text(section.heading, margin, y + 5)
      y += 8
    }

    if (text.trim()) {
      const lines = doc.splitTextToSize(text, contentW)
      for (const line of lines) {
        checkPage(6)
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.setFont('helvetica', 'normal')

        if (line.startsWith('•')) {
          doc.setFillColor(99, 102, 241)
          doc.circle(margin + 2, y + 2, 1, 'F')
          doc.text(line.replace('•', '').trim(), margin + 6, y + 4)
        } else if (line.match(/^\|\s/)) {
          doc.setTextColor(100, 116, 139)
          doc.text(line, margin, y + 4)
        } else {
          doc.text(line, margin, y + 4)
        }
        y += 5.5
      }
      y += 4
    }
  }

  // Add footers and page numbers
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    if (p > 1) drawFooter(p - 1, totalPages - 1)
  }

  doc.save(`test-plan-${jiraId}.pdf`)
}

// ─── Export Test Plan as DOCX ─────────────────────────────────────────────────
export async function exportTestPlanAsDocx(content: string, jiraId: string) {
  const sections = parseMarkdownSections(content)
  const children: any[] = []

  // Title
  children.push(
    new Paragraph({
      text: `TEST PLAN: ${jiraId}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, color: '6366F1', size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'RICE-POT Framework · IEEE 829 Compliant', color: '8B5CF6', size: 18, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
  )

  for (const section of sections) {
    const plainText = mdToPlain(section.content)

    if (section.level === 1) {
      children.push(new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        shading: { type: ShadingType.SOLID, fill: 'F8F7FF' },
      }))
    } else if (section.level === 2) {
      children.push(new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
      }))
    } else if (section.level === 3) {
      children.push(new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }))
    }

    if (plainText.trim()) {
      const lines = plainText.split('\n').filter(l => l.trim())
      for (const line of lines) {
        if (line.startsWith('•') || line.startsWith('- ')) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line.replace(/^[•-]\s*/, ''), size: 20 })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          }))
        } else if (line.match(/^\d+\.\s/)) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line.replace(/^\d+\.\s/, ''), size: 20 })],
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 60 },
          }))
        } else if (line.includes('|')) {
          // Skip table lines — simplified
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
            spacing: { after: 80 },
          }))
        }
      }
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
        },
      },
      children,
    }],
  })

  const buffer = await Packer.toBlob(doc)
  const el = document.createElement('a')
  el.href = URL.createObjectURL(buffer)
  el.download = `test-plan-${jiraId}.docx`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Export Test Cases as Jira-Importable CSV ─────────────────────────────────
export function exportTestCasesAsCSV(testCases: TestCase[], jiraId: string) {
  const headers = [
    'Summary',
    'Issue Type',
    'Priority',
    'Labels',
    'Test Type',
    'Scenario Type',
    'Component',
    'Estimated Time',
    'Precondition',
    'Step #',
    'Step Action',
    'Step Data',
    'Step Expected Result',
    'Status',
  ]

  const escape = (val: string): string => {
    if (!val) return ''
    const str = String(val).replace(/"/g, '""')
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
  }

  const rows: string[] = [headers.join(',')]

  for (const tc of testCases) {
    if (!tc.steps || tc.steps.length === 0) {
      rows.push([
        escape(tc.summary),
        escape(tc.issueType || 'Test'),
        escape(tc.priority || 'Medium'),
        escape(tc.labels || ''),
        escape(tc.testType || 'Functional'),
        escape(tc.scenarioType || ''),
        escape(tc.component || ''),
        escape(tc.estimatedTime || '30m'),
        escape(tc.precondition || ''),
        '',
        '',
        '',
        '',
        escape(tc.status || 'Not Executed'),
      ].join(','))
      continue
    }

    tc.steps.forEach((step, idx) => {
      rows.push([
        idx === 0 ? escape(tc.summary) : '',
        idx === 0 ? escape(tc.issueType || 'Test') : '',
        idx === 0 ? escape(tc.priority || 'Medium') : '',
        idx === 0 ? escape(tc.labels || '') : '',
        idx === 0 ? escape(tc.testType || 'Functional') : '',
        idx === 0 ? escape(tc.scenarioType || '') : '',
        idx === 0 ? escape(tc.component || '') : '',
        idx === 0 ? escape(tc.estimatedTime || '30m') : '',
        idx === 0 ? escape(tc.precondition || '') : '',
        escape(String(step.stepNumber || idx + 1)),
        escape(step.action || ''),
        escape(step.testData || ''),
        escape(step.expectedResult || ''),
        idx === 0 ? escape(tc.status || 'Not Executed') : '',
      ].join(','))
    })
  }

  const csvContent = rows.join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const el = document.createElement('a')
  el.href = URL.createObjectURL(blob)
  el.download = `test-cases-${jiraId}-jira-import.csv`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Export Playwright Automation Suite as Markdown ───────────────────────────
export function exportPlaywrightAsMD(data: PlaywrightAutomationData, jiraId: string) {
  let markdown = `# Playwright Test Automation Suite for ${jiraId}\n\n`
  
  markdown += `## README.md\n\`\`\`markdown\n${data.readme}\n\`\`\`\n\n`
  markdown += `## package.json\n\`\`\`json\n${data.packageJson}\n\`\`\`\n\n`
  markdown += `## tsconfig.json\n\`\`\`json\n${data.tsconfigJson}\n\`\`\`\n\n`
  markdown += `## playwright.config.ts\n\`\`\`typescript\n${data.playwrightConfig}\n\`\`\`\n\n`
  
  markdown += `## Test Cases Code\n\n`
  data.testFiles.forEach(file => {
    markdown += `### File: \`${file.filename}\`\n\`\`\`typescript\n${file.code}\n\`\`\`\n\n`
  })

  const el = document.createElement('a')
  el.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
  el.download = `playwright-automation-${jiraId}.md`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Export Playwright Automation Suite as ZIP ─────────────────────────────────
export async function exportPlaywrightAsZip(data: PlaywrightAutomationData, jiraId: string) {
  const zip = new JSZip()

  // Base folder name
  const folderName = `playwright-automation-${jiraId}`
  const folder = zip.folder(folderName)
  if (!folder) throw new Error('Failed to create ZIP folder')

  folder.file('README.md', data.readme)
  folder.file('package.json', data.packageJson)
  folder.file('tsconfig.json', data.tsconfigJson)
  folder.file('playwright.config.ts', data.playwrightConfig)

  // Test files
  data.testFiles.forEach(file => {
    // If the filename contains directories, JSZip folder.file() handles relative paths automatically
    folder.file(file.filename, file.code)
  })

  const content = await zip.generateAsync({ type: 'blob' })
  const el = document.createElement('a')
  el.href = URL.createObjectURL(content)
  el.download = `${folderName}.zip`
  document.body.appendChild(el); el.click(); document.body.removeChild(el)
}

// ─── Parse CSV back to TestCases ───────────────────────────────────────────────
const normalizeHeader = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseCSVToTestCases(csvText: string): TestCase[] {
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  // Split lines while respecting newlines inside quotes
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    if (char === '"') {
      inQuotes = !inQuotes
      currentLine += char
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine)
      currentLine = ''
    } else {
      currentLine += char
    }
  }
  if (currentLine) lines.push(currentLine)

  if (lines.length <= 1) return []

  // Auto-detect delimiter: comma, semicolon, tab, or pipe
  const firstLine = lines[0] || ''
  let delimiter = ','
  const delimiters = [',', ';', '\t', '|']
  let maxCount = -1
  for (const d of delimiters) {
    let count = 0
    let inside = false
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        inside = !inside
      } else if (firstLine[i] === d && !inside) {
        count++
      }
    }
    if (count > maxCount) {
      maxCount = count
      delimiter = d
    }
  }
  if (maxCount <= 0) {
    delimiter = ','
  }

  // Parse CSV row respecting quoted strings and custom delimiter
  const parseCSVRow = (rowText: string): string[] => {
    const cells: string[] = []
    let currentCell = ''
    let inside = false
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i]
      if (char === '"') {
        if (inside && rowText[i + 1] === '"') {
          currentCell += '"'
          i++ // skip next quote
        } else {
          inside = !inside
        }
      } else if (char === delimiter && !inside) {
        cells.push(currentCell.trim())
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    cells.push(currentCell.trim())
    return cells
  }

  const headers = parseCSVRow(lines[0])
  const getColIndex = (names: string[]): number => {
    const normalizedNames = names.map(n => normalizeHeader(n))
    
    // 1. Try exact matches on normalized headers
    let idx = headers.findIndex(h => {
      const val = normalizeHeader(h)
      return normalizedNames.some(n => val === n)
    })
    if (idx !== -1) return idx

    // 2. Try substring match on normalized headers (e.g. "namesummary" includes "summary")
    idx = headers.findIndex(h => {
      const val = normalizeHeader(h)
      return normalizedNames.some(n => val.includes(n) || n.includes(val))
    })
    return idx
  }

  // Expanded aliases mapping
  let colSummary = getColIndex(['summary', 'name', 'title', 'subject', 'testcase', 'test case', 'scenario', 'feature', 'test case summary', 'test case title', 'test summary'])
  if (colSummary === -1 && headers.length > 0) colSummary = 0 // Fallback to first column

  const colIssueType = getColIndex(['issue type', 'issue_type', 'type', 'tracker'])
  const colPriority = getColIndex(['priority', 'severity', 'importance'])
  const colLabels = getColIndex(['labels', 'tags', 'label', 'tag'])
  const colTestType = getColIndex(['test type', 'test_type', 'type of test'])
  const colScenarioType = getColIndex(['scenario type', 'scenario_type', 'scenario'])
  const colComponent = getColIndex(['component', 'module', 'section', 'feature area'])
  const colEstTime = getColIndex(['estimated time', 'estimated_time', 'time', 'duration', 'est time'])
  
  let colPrecondition = getColIndex(['precondition', 'preconditions', 'objective', 'description', 'pre-condition', 'test precondition', 'summary description'])
  
  const colStepNum = getColIndex(['step #', 'step_number', 'step', 'index', 'step no', 'step number', 'number'])
  
  let colStepAction = getColIndex(['step action', 'step_action', 'action', 'step description', 'steps', 'test steps', 'step content', 'description of step'])
  // Collision check: if step action matches summary or precondition (e.g. because of the word "description"), resolve it correctly
  if (colStepAction === colSummary || colStepAction === colPrecondition) {
    colStepAction = headers.findIndex((h, index) => 
      index !== colSummary && 
      index !== colPrecondition && 
      (h.toLowerCase().includes('action') || h.toLowerCase().includes('step') || h.toLowerCase().includes('description'))
    )
  }
  
  const colStepData = getColIndex(['step data', 'step_data', 'data', 'test data', 'input', 'test_data', 'step input'])
  const colStepExpected = getColIndex(['step expected result', 'step_expected_result', 'expected', 'expected result', 'result', 'expected_result', 'step expected', 'expected outcome'])
  const colStatus = getColIndex(['status', 'state', 'result status'])

  const testCases: TestCase[] = []
  let currentTC: TestCase | null = null
  let idCounter = 1

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells = parseCSVRow(lines[i])
    if (cells.length === 0) continue

    // The summary is only populated on the first row of a test case
    const summary = colSummary !== -1 && cells[colSummary] ? cells[colSummary] : ''

    if (summary) {
      // Create new TestCase
      currentTC = {
        id: `TC-${String(idCounter++).padStart(3, '0')}`,
        summary,
        issueType: colIssueType !== -1 ? cells[colIssueType] : 'Test',
        priority: colPriority !== -1 ? cells[colPriority] : 'Medium',
        labels: colLabels !== -1 ? cells[colLabels] : '',
        testType: colTestType !== -1 ? cells[colTestType] : 'Functional',
        scenarioType: (colScenarioType !== -1 && cells[colScenarioType] ? cells[colScenarioType] : 'happy_path') as any,
        component: colComponent !== -1 ? cells[colComponent] : '',
        estimatedTime: colEstTime !== -1 ? cells[colEstTime] : '15m',
        precondition: colPrecondition !== -1 ? cells[colPrecondition] : '',
        steps: [],
        status: colStatus !== -1 ? cells[colStatus] : 'Not Executed',
      }
      testCases.push(currentTC)
    }

    // Add steps to currentTestCase
    if (currentTC) {
      const action = colStepAction !== -1 ? cells[colStepAction] : ''
      const expectedResult = colStepExpected !== -1 ? cells[colStepExpected] : ''
      const testData = colStepData !== -1 ? cells[colStepData] : 'N/A'

      if (action || expectedResult) {
        let stepNum = currentTC.steps.length + 1
        if (colStepNum !== -1 && cells[colStepNum]) {
          const parsedNum = parseInt(cells[colStepNum], 10)
          if (!isNaN(parsedNum)) stepNum = parsedNum
        }
        currentTC.steps.push({
          stepNumber: stepNum,
          action: action || 'Perform action',
          testData: testData || 'N/A',
          expectedResult: expectedResult || 'Action completed successfully'
        })
      }
    }
  }

  return testCases
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = (err) => reject(err)
    document.body.appendChild(script)
  })
}

export async function parseExcelToCSV(file: File): Promise<string> {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
  const XLSX = (window as any).XLSX
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_csv(worksheet)
}

export async function parsePDFToText(file: File): Promise<string> {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  const pdfjsLib = (window as any).pdfjsLib
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    fullText += pageText + '\n'
  }
  
  return fullText
}

export async function parseDocxToText(file: File): Promise<string> {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js')
  const mammoth = (window as any).mammoth
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export function cleanHTMLToText(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Remove scripts, styles, navigation, headers, footers, etc.
  const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, noscript, iframe, svg, form')
  elementsToRemove.forEach(el => el.remove())
  
  const bodyText = doc.body?.innerText || doc.body?.textContent || ''
  
  return bodyText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}


