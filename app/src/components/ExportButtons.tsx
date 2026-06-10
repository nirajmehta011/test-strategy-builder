interface ExportButtonsProps {
  onCopy: () => void
  onExportMarkdown: () => void
  onExportJSON: () => void
  copied: boolean
}

export default function ExportButtons({
  onCopy,
  onExportMarkdown,
  onExportJSON,
  copied
}: ExportButtonsProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      <button
        onClick={onCopy}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
      </button>
      
      <button
        onClick={onExportMarkdown}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        📄 Download as Markdown
      </button>
      
      <button
        onClick={onExportJSON}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        🗂️ Download as JSON
      </button>
    </div>
  )
}
