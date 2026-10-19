import { useState } from 'react'
import {
  AlertCircle,
  Bell,
  Download,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Footer } from '@/components/layout/Footer'

interface SettingsPageProps {
  setPage: (page: string) => void
}

export function SettingsPage({ setPage }: SettingsPageProps) {
  const { user, signOut } = useAuth()
  const { settings, toggleSetting } = useUserSettings()
  const { toast } = useToast()
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: 'Signed out',
      description: 'You have been logged out successfully.',
    })
    setPage('home')
  }

  const handleExportData = () => {
    const data = {
      user: { id: user?.id, email: user?.email },
      exportedAt: new Date().toISOString(),
      platform: 'NutriScan Pro',
      settings
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nutriscan_account_archive_${format(new Date(), 'yyyy-MM-dd')}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: 'Data archive exported',
      description: 'Downloaded JSON archive of your account settings and preferences.',
    })
  }

  return (
    <>
      <main className="wrap settings-page">
        <p className="kicker">PREFERENCES & NOTIFICATIONS</p>
        <h1>Settings</h1>
        <p className="hero-lede" style={{ marginBottom: '32px' }}>
          Control automated reminders, measurement units, and your personal data controls.
        </p>

        {/* Notifications & Reminders */}
        <div className="settings-card">
          <h2>Notifications & Reminders</h2>
          <p className="card-desc">Choose when and how NutriScan sends you meal logging prompts.</p>

          <div className="switch-list">
            <div className="switch-item">
              <div className="switch-info">
                <strong><Bell size={16} color="var(--green)" /> Meal Logging Reminders</strong>
                <p>Receive notifications at breakfast, lunch, and dinner to log your plate.</p>
              </div>
              <button
                type="button"
                className={`theme-toggle-switch ${settings?.meal_reminders ?? true ? 'on' : ''}`}
                onClick={() => toggleSetting('meal_reminders')}
              >
                <span className="switch-handle" />
              </button>
            </div>

            <div className="switch-item">
              <div className="switch-info">
                <strong><AlertCircle size={16} color="var(--amber)" /> Calorie Budget Alerts</strong>
                <p>Alert you when you approach within 10% of your daily calorie limit.</p>
              </div>
              <button
                type="button"
                className={`theme-toggle-switch ${settings?.calorie_alerts ?? true ? 'on' : ''}`}
                onClick={() => toggleSetting('calorie_alerts')}
              >
                <span className="switch-handle" />
              </button>
            </div>

            <div className="switch-item">
              <div className="switch-info">
                <strong><Sparkles size={16} color="var(--green)" /> Hydration Reminders</strong>
                <p>Prompts throughout the day to meet your daily water goal.</p>
              </div>
              <button
                type="button"
                className={`theme-toggle-switch ${settings?.hydration_reminders ?? true ? 'on' : ''}`}
                onClick={() => toggleSetting('hydration_reminders')}
              >
                <span className="switch-handle" />
              </button>
            </div>
          </div>
        </div>

        {/* Display & Measurement Units */}
        <div className="settings-card">
          <h2>Measurement System</h2>
          <p className="card-desc">Choose how weights and dimensions are formatted across the app.</p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={`outline-button ${unit === 'metric' ? 'btn-primary' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { setUnit('metric'); toast({ title: 'Metric system active', description: 'Weight in kg, height in cm.' }) }}
            >
              Metric (kg, cm, kcal)
            </button>
            <button
              className={`outline-button ${unit === 'imperial' ? 'btn-primary' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { setUnit('imperial'); toast({ title: 'Imperial system active', description: 'Weight in lbs, height in ft/in.' }) }}
            >
              Imperial (lbs, ft/in, kcal)
            </button>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="settings-card">
          <h2>Data & Archives</h2>
          <p className="card-desc">Export your logged nutritional records or manage your account data.</p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button className="outline-button" onClick={handleExportData}>
              <Download size={15} /> Export Complete Archive (JSON)
            </button>
            <button className="outline-button" onClick={() => setPage('history')}>
              <Download size={15} /> Export Meal Log (CSV)
            </button>
          </div>
        </div>

        {/* Account Management */}
        <div className="settings-card" style={{ borderColor: '#fecaca', background: '#fffaf9' }}>
          <h2 style={{ color: '#dc2626' }}>Session & Account</h2>
          <p className="card-desc">Sign out or terminate your current authenticated session.</p>

          <Button
            onClick={handleSignOut}
            className="btn-primary"
            style={{ background: '#dc2626' }}
          >
            <LogOut size={16} /> Sign Out of NutriScan
          </Button>
        </div>
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default SettingsPage
