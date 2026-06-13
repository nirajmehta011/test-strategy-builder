import { useEffect } from 'react'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import TestStrategyPage from './components/TestStrategyPage'
import './styles/globals.css'

function AppContent() {
  const { settings, updatePreferences } = useSettings()
  const darkMode = settings.preferences.darkMode

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (window.innerWidth <= 768) {
      updatePreferences({ sidebarCollapsed: true })
    }
  }, [])

  const toggleDarkMode = () => {
    updatePreferences({ darkMode: !darkMode })
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark' : ''}`}>
      <Header darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
      <div className="app-body">
        <LeftPanel />
        <main className="main-content">
          <TestStrategyPage />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}
