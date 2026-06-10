import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export type AIProvider = 'groq' | 'openrouter' | 'gemini' | 'openai'

export interface Settings {
  jira: {
    email: string
    token: string
    baseUrl: string
  }
  ai: {
    provider: AIProvider
    groqApiKey: string
    openRouterApiKey: string
    geminiApiKey: string
    openAiApiKey: string
    selectedModel: string
    openRouterModel: string
    geminiModel: string
    openAiModel: string
  }
  preferences: {
    darkMode: boolean
    autoSave: boolean
    sidebarCollapsed: boolean
  }
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  updateAI: (fields: Partial<Settings['ai']>) => void
  updateJira: (fields: Partial<Settings['jira']>) => void
  updatePreferences: (fields: Partial<Settings['preferences']>) => void
  loadSettings: () => void
  clearSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const defaultSettings: Settings = {
  jira: { email: '', token: '', baseUrl: '' },
  ai: {
    provider: 'groq',
    groqApiKey: '',
    openRouterApiKey: '',
    geminiApiKey: '',
    openAiApiKey: '',
    selectedModel: 'llama3-70b-8192',
    openRouterModel: 'openai/gpt-4o',
    geminiModel: 'gemini-1.5-pro',
    openAiModel: 'gpt-4o',
  },
  preferences: { darkMode: true, autoSave: true, sidebarCollapsed: false }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const save = (s: Settings) => {
    localStorage.setItem('blast_settings_v2', JSON.stringify(s))
  }

  const loadSettings = () => {
    const stored = localStorage.getItem('blast_settings_v2')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Deep merge to handle new fields
        setSettings(prev => ({
          ...prev,
          ...parsed,
          ai: { ...prev.ai, ...parsed.ai },
          jira: { ...prev.jira, ...parsed.jira },
          preferences: { ...prev.preferences, ...parsed.preferences },
        }))
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
  }

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      save(updated)
      return updated
    })
  }

  const updateAI = (fields: Partial<Settings['ai']>) => {
    setSettings(prev => {
      const updated = { ...prev, ai: { ...prev.ai, ...fields } }
      save(updated)
      return updated
    })
  }

  const updateJira = (fields: Partial<Settings['jira']>) => {
    setSettings(prev => {
      const updated = { ...prev, jira: { ...prev.jira, ...fields } }
      save(updated)
      return updated
    })
  }

  const updatePreferences = (fields: Partial<Settings['preferences']>) => {
    setSettings(prev => {
      const updated = { ...prev, preferences: { ...prev.preferences, ...fields } }
      save(updated)
      return updated
    })
  }

  const clearSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem('blast_settings_v2')
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings, updateAI, updateJira, updatePreferences, loadSettings, clearSettings
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
