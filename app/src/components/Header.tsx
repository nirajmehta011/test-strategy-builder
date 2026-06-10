interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

export default function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-logo">🧪</div>
        <div>
          <div className="header-title">BLAST Test Strategy Builder</div>
          <div className="header-subtitle">AI-powered QA strategy generator</div>
        </div>
      </div>

      <div className="header-controls">
        <button
          className="icon-btn"
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
