import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import jiraService from '../services/jiraService'
import groqService from '../services/groqService'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [testingJira, setTestingJira] = useState(false)
  const [testingGroq, setTestingGroq] = useState(false)
  const [jiraStatus, setJiraStatus] = useState<string | null>(null)
  const [groqStatus, setGroqStatus] = useState<string | null>(null)
  const [groqModels, setGroqModels] = useState<any[]>([])

  const handleJiraChange = (field: string, value: string) => {
    updateSettings({
      jira: { ...settings.jira, [field]: value }
    })
  }

  const handleGroqChange = (field: string, value: string) => {
    updateSettings({
      groq: { ...settings.groq, [field]: value }
    })
  }

  const testJiraConnection = async () => {
    setTestingJira(true)
    setJiraStatus(null)
    try {
      if (!settings.jira.baseUrl || !settings.jira.email || !settings.jira.token) {
        setJiraStatus('❌ Please fill in all Jira fields')
        setTestingJira(false)
        return
      }
      
      jiraService.initialize(settings.jira.email, settings.jira.token, settings.jira.baseUrl)
      
      const response = await fetch(`${API_BASE}/jira/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: settings.jira.email,
          token: settings.jira.token,
          baseUrl: settings.jira.baseUrl
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setJiraStatus(`✅ Jira connection successful! (User: ${data.user.displayName})`)
      } else {
        setJiraStatus(`❌ ${data.error}`)
      }
    } catch (error: any) {
      console.error('Jira connection error:', error)
      if (error.message.includes('Failed to fetch')) {
        setJiraStatus('❌ Cannot connect to backend server. Make sure the backend is running on port 3001.')
      } else {
        setJiraStatus(`❌ Error: ${error.message}`)
      }
    } finally {
      setTestingJira(false)
    }
  }

  const testGroqConnection = async () => {
    setTestingGroq(true)
    setGroqStatus(null)
    try {
      if (!settings.groq.apiKey) {
        setGroqStatus('❌ Please enter a Groq API key')
        setTestingGroq(false)
        return
      }
      
      groqService.initialize(settings.groq.apiKey)
      
      const response = await fetch(`${API_BASE}/groq/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: settings.groq.apiKey })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setGroqModels(data.models)
        setGroqStatus(`✅ Groq connection successful! (${data.models.length} models available)`)
      } else {
        setGroqStatus(`❌ ${data.error}`)
      }
    } catch (error: any) {
      console.error('Groq connection error:', error)
      if (error.message.includes('Failed to fetch')) {
        setGroqStatus('❌ Cannot connect to backend server. Make sure the backend is running on port 3001.')
      } else {
        setGroqStatus(`❌ ${error.message}`)
      }
    } finally {
      setTestingGroq(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h2>

      {/* Jira Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Jira Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jira Email
            </label>
            <input
              type="email"
              value={settings.jira.email}
              onChange={(e) => handleJiraChange('email', e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jira API Token
            </label>
            <input
              type="password"
              value={settings.jira.token}
              onChange={(e) => handleJiraChange('token', e.target.value)}
              placeholder="APAT***"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jira Base URL
            </label>
            <input
              type="url"
              value={settings.jira.baseUrl}
              onChange={(e) => handleJiraChange('baseUrl', e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            onClick={testJiraConnection}
            disabled={testingJira}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition"
          >
            {testingJira ? 'Testing...' : 'Test Connection'}
          </button>
          
          {jiraStatus && (
            <p className={`text-sm ${jiraStatus.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {jiraStatus}
            </p>
          )}
        </div>
      </div>

      {/* Groq Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Groq Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Groq API Key
            </label>
            <input
              type="password"
              value={settings.groq.apiKey}
              onChange={(e) => handleGroqChange('apiKey', e.target.value)}
              placeholder="gsk_***"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selected Model
            </label>
            {groqModels.length > 0 ? (
              <select
                value={settings.groq.selectedModel}
                onChange={(e) => handleGroqChange('selectedModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {groqModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.groq.selectedModel}
                onChange={(e) => handleGroqChange('selectedModel', e.target.value)}
                placeholder="mixtral-8x7b-32768"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>

          <button
            onClick={testGroqConnection}
            disabled={testingGroq}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition"
          >
            {testingGroq ? 'Testing...' : 'Test Connection & Load Models'}
          </button>
          
          {groqStatus && (
            <p className={`text-sm ${groqStatus.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {groqStatus}
            </p>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Preferences</h3>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.preferences.autoSave}
            onChange={(e) => updateSettings({
              preferences: { ...settings.preferences, autoSave: e.target.checked }
            })}
            className="w-4 h-4 rounded"
          />
          <span className="ml-3 text-gray-700 dark:text-gray-300">Auto-save strategies</span>
        </label>
      </div>
    </div>
  )
}
