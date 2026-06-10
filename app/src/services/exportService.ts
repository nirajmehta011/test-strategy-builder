export function exportAsMarkdown(content: string, jiraId: string) {
  const element = document.createElement('a')
  const file = new Blob([content], { type: 'text/markdown' })
  element.href = URL.createObjectURL(file)
  element.download = `test-strategy-${jiraId}.md`
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export function exportAsJSON(content: string, jiraId: string) {
  const jsonData = {
    jira_id: jiraId,
    generated_at: new Date().toISOString(),
    format: 'markdown',
    content: content
  }
  
  const element = document.createElement('a')
  const file = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
  element.href = URL.createObjectURL(file)
  element.download = `test-strategy-${jiraId}.json`
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false)
}
