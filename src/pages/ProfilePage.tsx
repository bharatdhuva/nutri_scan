import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Footer } from '@/components/layout/Footer'

interface ProfilePageProps {
  setPage: (page: string) => void
}

export function ProfilePage({ setPage }: ProfilePageProps) {
  const { user, profile } = useAuth()
  const { updateProfile, calculateDailyCalories, loading } = useProfile()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || user?.user_metadata?.full_name || '',
    age: profile?.age ? profile.age.toString() : '',
    gender: profile?.gender || 'male',
    height_cm: profile?.height_cm ? profile.height_cm.toString() : '',
    weight_kg: profile?.weight_kg ? profile.weight_kg.toString() : '',
    activity_level: profile?.activity_level || 'moderate',
    diet_goal: profile?.diet_goal || 'maintenance',
    dietary_preference: (profile as any)?.dietary_preference || 'veg',
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || user?.user_metadata?.full_name || '',
        age: profile.age ? profile.age.toString() : '',
        gender: profile.gender || 'male',
        height_cm: profile.height_cm ? profile.height_cm.toString() : '',
        weight_kg: profile.weight_kg ? profile.weight_kg.toString() : '',
        activity_level: profile.activity_level || 'moderate',
        diet_goal: profile.diet_goal || 'maintenance',
        dietary_preference: (profile as any)?.dietary_preference || 'veg',
      })
    }
  }, [profile, user])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const parsedHeight = parseFloat(formData.height_cm)
  const parsedWeight = parseFloat(formData.weight_kg)
  const hasBiometrics = !isNaN(parsedHeight) && parsedHeight > 0 && !isNaN(parsedWeight) && parsedWeight > 0
  const heightM = parsedHeight / 100
  const bmi = hasBiometrics ? (parsedWeight / (heightM * heightM)).toFixed(1) : null

  const calculatedCalories = hasBiometrics && formData.age ? calculateDailyCalories(
    parsedWeight,
    parsedHeight,
    parseInt(formData.age),
    formData.gender,
    formData.activity_level,
    formData.diet_goal
  ) : 2000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile({
      full_name: formData.full_name || null,
      age: formData.age ? parseInt(formData.age) : null,
      gender: formData.gender as any,
      height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
      activity_level: formData.activity_level as any,
      diet_goal: formData.diet_goal as any,
      dietary_preference: formData.dietary_preference as any,
      daily_calorie_target: calculatedCalories,
    })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      })
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast({
        title: 'Password updated',
        description: 'Your account password has been updated.',
      })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast({
        title: 'Error updating password',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const initials = formData.full_name
    ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <>
      <main className="wrap profile-page">
        <p className="kicker">YOUR ACCOUNT & HEALTH PROFILE</p>
        <h1>Health Profile</h1>
        <p className="hero-lede" style={{ marginBottom: '32px' }}>
          Personalize your biometrics, activity level, and dietary goals to power accurate AI calories and meal recommendations.
        </p>

        {/* User Card */}
        <div className="profile-card">
          <div className="avatar-row">
            <div className="avatar-circle">{initials}</div>
            <div>
              <h2 style={{ margin: 0 }}>{formData.full_name || 'NutriScan Member'}</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '14px' }}>{user?.email || 'user@example.com'}</p>
              <span className="tag" style={{ marginTop: '8px' }}>
                <ShieldCheck size={13} /> Verified Member
              </span>
            </div>
          </div>
        </div>

        {/* Biometrics & Goals Form */}
        <form onSubmit={handleSubmit}>
          <div className="profile-card">
            <h2>Personal Information</h2>
            <p className="card-desc">Your basic details used for nutrition calculations.</p>

            <div className="profile-form-grid">
              <div className="form-group full-width">
                <label>Full Name</label>
                <input
                  className="form-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Alex Sharma"
                />
              </div>

              <div className="form-group">
                <label>Age (years)</label>
                <input
                  className="form-input"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  min="12"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  className="form-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  className="form-input"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  min="100"
                  max="250"
                />
              </div>

              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  className="form-input"
                  type="number"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  min="30"
                  max="300"
                  step="0.5"
                />
              </div>
            </div>

            {/* BMI Badge */}
            <div style={{ marginTop: '20px', padding: '14px 18px', background: 'var(--tint)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="label-small">BODY MASS INDEX (BMI)</span>
                <strong style={{ display: 'block', fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                  {bmi} kg/m²
                </strong>
              </div>
              <span className="status" style={{ fontSize: '12px' }}>
                {parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal weight' : 'Overweight'}
              </span>
            </div>
          </div>

          <div className="profile-card">
            <h2>Nutrition & Goal Settings</h2>
            <p className="card-desc">Define your activity multiplier and dietary target.</p>

            <div className="profile-form-grid">
              <div className="form-group">
                <label>Activity Level</label>
                <select
                  className="form-input"
                  value={formData.activity_level}
                  onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                >
                  <option value="sedentary">Sedentary (desk job, minimal movement)</option>
                  <option value="light">Lightly Active (1-3 workout days/wk)</option>
                  <option value="moderate">Moderately Active (3-5 workouts/wk)</option>
                  <option value="active">Active (6-7 intense days/wk)</option>
                  <option value="very_active">Very Active (athlete, manual labor)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Dietary Goal</label>
                <select
                  className="form-input"
                  value={formData.diet_goal}
                  onChange={(e) => setFormData({ ...formData, diet_goal: e.target.value })}
                >
                  <option value="weight_loss">Weight Loss (−500 kcal deficit)</option>
                  <option value="maintenance">Maintenance (Energy equilibrium)</option>
                  <option value="muscle_gain">Muscle Gain (+300 kcal surplus)</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Dietary Preference</label>
                <select
                  className="form-input"
                  value={formData.dietary_preference}
                  onChange={(e) => setFormData({ ...formData, dietary_preference: e.target.value })}
                >
                  <option value="veg">Indian Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian (Chicken, Fish, Eggs)</option>
                  <option value="vegan">Pure Plant-Based Vegan</option>
                </select>
              </div>
            </div>

            {/* Calculated Calorie Output */}
            <div style={{ marginTop: '20px', padding: '16px 20px', background: 'var(--surface-subtle)', border: '1px solid var(--line)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="label-small">RECOMMENDED DAILY CALORIE INTAKE</span>
                <strong style={{ display: 'block', fontSize: '26px', fontFamily: 'var(--font-mono)', color: 'var(--text)', marginTop: '2px' }}>
                  {calculatedCalories} <small style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>kcal / day</small>
                </strong>
              </div>
              <span className="chart-target-badge">Mifflin-St Jeor BMR</span>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '46px', marginBottom: '32px' }}>
            {loading ? 'Saving profile...' : 'Save Profile Changes'} <ArrowRight data-icon="inline-end" size={16} />
          </Button>
        </form>

        {/* Change Password Card */}
        <div className="profile-card">
          <h2>Security & Password</h2>
          <p className="card-desc">Update your account login password.</p>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrap">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={passwordLoading} className="outline-button" style={{ alignSelf: 'flex-start' }}>
              {passwordLoading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default ProfilePage
