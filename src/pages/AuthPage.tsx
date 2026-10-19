import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { SampleLabel } from '@/components/home/SampleLabel'

interface AuthPageProps {
  initialMode?: 'signin' | 'signup'
  setPage: (page: string) => void
}

export function AuthPage({ initialMode = 'signin', setPage }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { signIn, signUp, user } = useAuth()
  const { toast } = useToast()

  // Redirect if already logged in
  useEffect(() => {
    if (user) setPage('home')
  }, [user, setPage])

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleOAuth = async () => {
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/nutriscan-pro/'}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) {
        setErrorMsg(error.message)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in failed. Please try again.')
    }
  }

  // ─── Email / Password Submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, name)
        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setErrorMsg('This email is already registered. Please sign in instead.')
          } else {
            setErrorMsg(error.message)
          }
        } else {
          toast({ title: 'Welcome to NutriScan! 🎉', description: 'Your account has been created.' })
          setPage('home')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('invalid') || msg.includes('credentials')) {
            setErrorMsg('Incorrect email or password. Please try again.')
          } else if (msg.includes('email not confirmed')) {
            setErrorMsg('Please confirm your email first, or use Google login.')
          } else {
            setErrorMsg(error.message)
          }
        } else {
          toast({ title: 'Welcome back! 👋', description: 'Successfully signed in.' })
          setPage('home')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m)
    setErrorMsg('')
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <main className="auth-page">
      {/* ── Left: Form ── */}
      <div className="auth-form-wrap">

        {/* Tabs */}
        <div className="auth-header-row">
          <p className="kicker" style={{ margin: 0 }}>NUTRISCAN ACCOUNT</p>
          <div className="auth-tabs compact" role="tablist">
            <button
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode('signin')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
              type="button"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ marginTop: '12px' }}>
          {mode === 'signin' ? 'Welcome back.' : 'Start with clarity.'}
        </h1>
        <p className="muted" style={{ marginBottom: '20px' }}>
          {mode === 'signin'
            ? 'Sign in to continue analyzing your meals and tracking your health goals.'
            : 'Create your free account to track nutrition history, macros, and AI meal plans.'}
        </p>

        {/* Error */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: '8px', padding: '12px 14px', fontSize: '13px',
            marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Button */}
        <button type="button" className="btn-oauth" onClick={handleGoogleOAuth} style={{ marginTop: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
        </button>

        <div className="auth-divider">OR CONTINUE WITH EMAIL</div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                className="form-input"
                type="text"
                placeholder="e.g. Alex Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="password-input-wrap">
              <input
                id="auth-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', height: '44px', marginTop: '4px' }}
          >
            {loading
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </form>

        <p className="auth-links" style={{ marginTop: '20px' }}>
          {mode === 'signin' ? (
            <>Don't have an account?{' '}<button onClick={() => switchMode('signup')}>Sign up free</button></>
          ) : (
            <>Already have an account?{' '}<button onClick={() => switchMode('signin')}>Sign in</button></>
          )}
        </p>
      </div>

      {/* ── Right: Editorial Showcase ── */}
      <div className="auth-aside">
        <div style={{ height: '30px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <p className="kicker" style={{ margin: 0 }}>A BETTER WAY TO READ DINNER</p>
        </div>
        <h2 style={{ marginTop: '12px' }}>Good health starts with understanding the small things.</h2>
        <p className="muted" style={{ fontSize: '15px', maxWidth: '420px', marginBottom: '24px', lineHeight: '1.6' }}>
          Photograph any plate of food and instantly unlock actionable calories, macro ratios, and healthy substitutes.
        </p>
        <div style={{ maxWidth: '440px' }}>
          <SampleLabel />
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '28px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="var(--green)" /> 98% AI Precision
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--green)" /> Private & Encrypted
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--green)" /> Tailored to Indian Diets
          </span>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
