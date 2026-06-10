import ReactMarkdown from 'react-markdown'

interface StrategyDisplayProps {
  content: string
}

export default function StrategyDisplay({ content }: StrategyDisplayProps) {
  return (
    <div className="markdown">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
