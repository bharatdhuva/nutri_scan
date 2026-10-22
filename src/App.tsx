import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Header } from '@/components/layout/Header'
import { HomePage } from '@/pages/HomePage'
import { AnalyzePage } from '@/pages/AnalyzePage'
import { PackagedScanPage } from '@/pages/PackagedScanPage'
import { ResultPage } from '@/pages/ResultPage'

import { AuthPage } from '@/pages/AuthPage'
import { MealPlannerPage } from '@/pages/MealPlannerPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { DietHistoryPage } from '@/pages/DietHistoryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'
import { TermsPage } from '@/pages/TermsPage'

import { useAuth } from './contexts/AuthContext'

function AppContent() {
  const [page, setPage] = useState('home')
  const { user } = useAuth()
  const [currentAnalysis, setCurrentAnalysisState] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('nutriscan_current_analysis')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const setCurrentAnalysis = (data: any) => {
    setCurrentAnalysisState(data)
    try {
      if (data) {
        sessionStorage.setItem('nutriscan_current_analysis', JSON.stringify(data))
      } else {
        sessionStorage.removeItem('nutriscan_current_analysis')
      }
    } catch (e) {
      console.warn('Failed to cache currentAnalysis:', e)
    }
  }

  // Clear current analysis when user explicitly signs out
  useEffect(() => {
    if (!user) {
      setCurrentAnalysisState(null)
    }
  }, [user])

  return (
    <div className="app-container">
      <Header page={page} setPage={setPage} />

      {page === 'home' && <HomePage setPage={setPage} />}
      {page === 'analyze' && (
        <AnalyzePage
          setPage={setPage}
          onAnalysisComplete={(res) => setCurrentAnalysis(res)}
        />
      )}
      {page === 'packaged' && (
        <PackagedScanPage
          setPage={setPage}
          onAnalysisComplete={(res) => setCurrentAnalysis(res)}
        />
      )}
      {page === 'results' && (

        <ResultPage
          analysisData={currentAnalysis}
          setPage={setPage}
        />
      )}
      {page === 'signin' && (
        <AuthPage
          initialMode="signin"
          setPage={setPage}
        />
      )}
      {page === 'signup' && (
        <AuthPage
          initialMode="signup"
          setPage={setPage}
        />
      )}
      {page === 'planner' && <MealPlannerPage setPage={setPage} />}
      {page === 'progress' && <ProgressPage setPage={setPage} />}
      {page === 'history' && (
        <DietHistoryPage
          setPage={setPage}
          onViewMealLabel={(mealAnalysis) => {
            setCurrentAnalysis(mealAnalysis)
            setPage('results')
          }}
        />
      )}
      {page === 'profile' && <ProfilePage setPage={setPage} />}
      {page === 'settings' && <SettingsPage setPage={setPage} />}
      {page === 'privacy' && <PrivacyPolicyPage setPage={setPage} />}
      {page === 'terms' && <TermsPage setPage={setPage} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}
