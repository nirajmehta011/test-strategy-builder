import { useSettings } from '../context/SettingsContext'

interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

export default function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  const { settings, updatePreferences } = useSettings()
  const sidebarCollapsed = settings.preferences.sidebarCollapsed

  const toggleSidebar = () => {
    updatePreferences({ sidebarCollapsed: !sidebarCollapsed })
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <button
          className={`sidebar-toggle-btn icon-btn ${!sidebarCollapsed ? 'active' : ''}`}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Show Settings Panel' : 'Hide Settings Panel'}
          aria-label="Toggle settings sidebar"
        >
          ⚙️
        </button>
        <div className="header-logo">🧪</div>
        <div>
          <div className="header-title">QA Nexus</div>
          <div className="header-subtitle">AI-powered QA intelligent suite</div>
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
