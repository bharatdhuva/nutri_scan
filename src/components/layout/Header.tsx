import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowRight, LogOut, Menu, X } from 'lucide-react'

interface HeaderProps {
  page: string
  setPage: (page: string) => void
}

export function Header({ page, setPage }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const { toast } = useToast()

  const go = (nextPage: string) => {
    setPage(nextPage)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    setUserDropdownOpen(false)
    await signOut()
    toast({
      title: 'Signed out',
      description: 'You have been logged out successfully.',
    })
    go('home')
  }

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" onClick={(e) => { e.preventDefault(); go('home') }}>
        <span className="leaf-dot" />
        NutriScan
      </a>

      {/* Primary Navigation */}
      <nav aria-label="Primary navigation" className={`desktop-nav${menuOpen ? ' is-open' : ''}`}>
        <button className={page === 'home' ? 'active' : ''} onClick={() => go('home')}>
          Home
        </button>
        <button className={page === 'analyze' ? 'active' : ''} onClick={() => go('analyze')}>
          Analyze
        </button>
        <button className={page === 'planner' ? 'active' : ''} onClick={() => go('planner')}>
          Meal Planner
        </button>
        <button className={page === 'progress' ? 'active' : ''} onClick={() => go('progress')}>
          Progress
        </button>
        <button className={page === 'history' ? 'active' : ''} onClick={() => go('history')}>
          Diet History
        </button>

        {user ? (
          <>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                className="header-user-badge"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px 4px 4px',
                  borderRadius: '999px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: 'none',
                  textDecoration: 'none',
                }}
              >
                {profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt="Profile"
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--green)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {(profile?.full_name || user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                  {profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      minWidth: '180px',
                      zIndex: 100,
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        go('profile')
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        borderRadius: '8px',
                        background: page === 'profile' ? 'var(--tint)' : 'transparent',
                        color: page === 'profile' ? 'var(--green)' : 'var(--text)',
                        border: 0,
                        cursor: 'pointer',
                        fontWeight: 500,
                        width: '100%',
                      }}
                    >
                      Health Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        go('settings')
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        borderRadius: '8px',
                        background: page === 'settings' ? 'var(--tint)' : 'transparent',
                        color: page === 'settings' ? 'var(--green)' : 'var(--text)',
                        border: 0,
                        cursor: 'pointer',
                        fontWeight: 500,
                        width: '100%',
                      }}
                    >
                      Settings
                    </button>
                    <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        borderRadius: '8px',
                        color: '#dc2626',
                        background: 'transparent',
                        border: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 500,
                        width: '100%',
                      }}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <button className={page === 'signin' || page === 'signup' ? 'active' : ''} onClick={() => go('signin')}>
              Sign In
            </button>
            <Button onClick={() => go('analyze')} className="btn-primary">
              Get Started <ArrowRight data-icon="inline-end" size={16} />
            </Button>
          </>
        )}
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        className="menu-button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  )
}

export default Header
