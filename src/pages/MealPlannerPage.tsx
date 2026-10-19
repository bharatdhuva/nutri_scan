import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useMeals } from '@/hooks/useMeals'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Footer } from '@/components/layout/Footer'
import { getFoodImage } from '@/lib/foodImages'
import type { MealPlan } from '@/types/database'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface MealPlannerPageProps {
  setPage: (page: string) => void
}

export function MealPlannerPage({ setPage }: MealPlannerPageProps) {
  const { user, profile } = useAuth()
  const {
    mealPlans,
    generating,
    generateMealPlan,
    toggleMealCompletion,
    deleteMealPlan,
    addCustomMeal
  } = useMealPlans()
  const { addMeal } = useMeals()
  const { toast } = useToast()

  const [selectedDay, setSelectedDay] = useState('Monday')
  const [goal, setGoal] = useState<'weight-loss' | 'balanced' | 'muscle'>('balanced')
  const [calorieTarget, setCalorieTarget] = useState('2000')
  const [dietaryPreference, setDietaryPreference] = useState<'veg' | 'non-veg' | 'vegan'>('veg')

  // Detailed Meal View Modal state
  const [selectedMealDetail, setSelectedMealDetail] = useState<MealPlan | null>(null)

  // Custom meal modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [customForm, setCustomForm] = useState({
    food_name: '',
    meal_type: 'breakfast',
    calories: '350',
    protein: '18',
    description: '',
  })
  const [savingCustom, setSavingCustom] = useState(false)

  useEffect(() => {
    if (profile?.dietary_preference) {
      setDietaryPreference(profile.dietary_preference)
    }
    if (profile?.daily_calorie_target) {
      setCalorieTarget(String(profile.daily_calorie_target))
    }
  }, [profile])

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to generate and save your AI meal plan.',
        variant: 'destructive',
      })
      setPage('signin')
      return
    }

    try {
      await generateMealPlan(7, dietaryPreference, {
        targetDate: format(new Date(), 'yyyy-MM-dd'),
        silent: false,
      })
    } catch (err: any) {
      console.warn('Meal plan generation notice:', err)
    }
  }

  // Filter meal plans by the selected day
  const dayIndex = weekDays.indexOf(selectedDay)
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(mealPlans.map(m => m.plan_date))).sort()
  }, [mealPlans])

  const targetDate = uniqueDates[dayIndex] || format(new Date(), 'yyyy-MM-dd')

  const mealsForDay = useMemo(() => {
    if (mealPlans.length > 0 && targetDate) {
      return mealPlans.filter(m => m.plan_date === targetDate)
    }
    return []
  }, [mealPlans, targetDate])

  const totalCalories = mealsForDay.reduce((acc, m) => acc + (m.calories || 0), 0)
  const totalProtein = mealsForDay.reduce((acc, m) => acc + (m.protein || 0), 0)

  const handleAddCustomMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add custom meals to your plan.',
        variant: 'destructive',
      })
      setPage('signin')
      return
    }

    if (!customForm.food_name.trim()) {
      toast({
        title: 'Missing name',
        description: 'Please enter a name for the meal.',
        variant: 'destructive',
      })
      return
    }

    setSavingCustom(true)
    try {
      await addCustomMeal({
        plan_date: targetDate,
        meal_type: customForm.meal_type,
        food_name: customForm.food_name.trim(),
        calories: parseInt(customForm.calories) || 300,
        protein: parseFloat(customForm.protein) || 15,
        description: customForm.description.trim() || 'Custom home prepared meal',
      })
      setCustomForm({
        food_name: '',
        meal_type: 'breakfast',
        calories: '350',
        protein: '18',
        description: '',
      })
      setShowAddModal(false)
    } finally {
      setSavingCustom(false)
    }
  }

  return (
    <>
      <main className="wrap feature-page">
        <p className="kicker">PERSONAL AI NUTRITION</p>
        <h1>Plan a week that feels good.</h1>
        <p className="hero-lede">
          Tell NutriScan what you want to eat and get a practical Indian meal plan built around your exact calorie and macro targets.
        </p>

        <section className="planner-form">
          <label>
            Goal
            <select value={goal} onChange={(e) => setGoal(e.target.value as any)}>
              <option value="balanced">Balanced eating & maintenance</option>
              <option value="weight-loss">Healthy weight loss (−400 kcal)</option>
              <option value="muscle">Muscle build & high protein</option>
            </select>
          </label>
          <label>
            Daily Target (kcal)
            <input
              type="number"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
              min="1200"
              max="4000"
              step="50"
            />
          </label>
          <label>
            Diet Preference
            <select
              value={dietaryPreference}
              onChange={(e) => setDietaryPreference(e.target.value as any)}
            >
              <option value="veg">Indian Vegetarian</option>
              <option value="non-veg">Non-Vegetarian (Chicken / Egg / Fish)</option>
              <option value="vegan">Pure Plant-Based Vegan</option>
            </select>
          </label>
          <Button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                Regenerate AI Plan <ArrowRight data-icon="inline-end" size={16} />
              </>
            )}
          </Button>
        </section>

        <section style={{ marginTop: '30px' }}>
          {/* Week Day Tabs */}
          <div className="day-tabs">
            {weekDays.map((d) => (
              <button
                key={d}
                className={`day-tab ${selectedDay === d ? 'active' : ''}`}
                onClick={() => setSelectedDay(d)}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Day Summary Banner */}
          <div className="day-summary-banner">
            <div className="day-summary-info">
              <span className="day-summary-kicker">{selectedDay.toUpperCase()} OVERVIEW</span>
              <span className="day-summary-stats">
                {totalCalories > 0 ? `${totalCalories} kcal total · ${totalProtein}g Protein` : 'Personalized AI Meal Plan'}
              </span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="outline-button day-summary-add-btn"
            >
              <Plus size={14} /> Add Custom Meal
            </button>
          </div>

          {/* Meal Cards Grid */}
          <div className="meal-cards-grid">
            {mealsForDay.length > 0 ? (
              mealsForDay.map((item) => (
                <article
                  className="meal-card"
                  key={item.id}
                  onClick={() => setSelectedMealDetail(item)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view detailed nutrition & recipe overview"
                >
                  <div className="meal-card-media">
                    <img
                      src={getFoodImage(item.food_name, item.meal_type)}
                      alt={item.food_name}
                      loading="lazy"
                    />
                  </div>
                  <div className="meal-card-body">
                    <div className="meal-card-header">
                      <span className="meal-card-type">{item.meal_type.toUpperCase()}</span>
                      <div className="meal-card-actions">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMealCompletion(item.id)
                          }}
                          className={`meal-status-btn ${item.is_completed ? 'completed' : ''}`}
                        >
                          <Check size={12} /> {item.is_completed ? 'Eaten' : 'Mark Eaten'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMealPlan(item.id)
                          }}
                          className="meal-delete-btn"
                          title="Delete this meal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <h3 className="meal-card-title">{item.food_name}</h3>
                    <p className="meal-card-desc">{item.description || 'Nutrient-rich balanced meal formulated by AI.'}</p>
                    <div className="meal-card-footer">
                      <span className="meal-calories">{item.calories} kcal</span>
                      <span className="meal-protein">{item.protein}g protein</span>
                    </div>
                  </div>
                </article>
              ))
            ) : !user ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', gridColumn: '1 / -1', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ margin: '0 0 8px' }}>Sign in to create your AI Meal Plan</h3>
                <p className="muted" style={{ margin: '0 0 20px', maxWidth: '400px', marginInline: 'auto' }}>
                  Your generated 7-day meal plans and custom dishes will be tailored and securely saved to your account.
                </p>
                <Button onClick={() => setPage('signin')} className="btn-primary">
                  Sign In to Plan Meals <ArrowRight size={15} />
                </Button>
              </div>
            ) : (
              <div style={{ padding: '50px 20px', textAlign: 'center', gridColumn: '1 / -1', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ margin: '0 0 8px' }}>No meal plan generated yet</h3>
                <p className="muted" style={{ margin: '0 0 20px' }}>
                  Click "Generate AI Plan" above to create a personalized 7-day nutrition schedule.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Button onClick={handleGenerate} disabled={generating} className="btn-primary">
                    <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Generate 7-Day Plan
                  </Button>
                  <button onClick={() => setShowAddModal(true)} className="outline-button">
                    <Plus size={16} /> Add Custom Meal
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add Custom Meal Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="kicker" style={{ margin: 0 }}>NEW MEAL FOR {selectedDay.toUpperCase()}</p>
                <h2>Add Custom Meal</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCustomMeal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Dish Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Spiced Paneer Bhurji & Multigrain Rotis"
                  value={customForm.food_name}
                  onChange={(e) => setCustomForm({ ...customForm, food_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Meal Time</label>
                  <select
                    className="form-input"
                    value={customForm.meal_type}
                    onChange={(e) => setCustomForm({ ...customForm, meal_type: e.target.value })}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Calories (kcal) *</label>
                  <input
                    className="form-input"
                    type="number"
                    required
                    min="10"
                    max="3000"
                    value={customForm.calories}
                    onChange={(e) => setCustomForm({ ...customForm, calories: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Protein (grams)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="200"
                  value={customForm.protein}
                  onChange={(e) => setCustomForm({ ...customForm, protein: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description / Ingredients</label>
                <input
                  className="form-input"
                  placeholder="e.g. Made with low-fat paneer, capsicum, and fresh coriander"
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <Button type="submit" disabled={savingCustom} className="btn-primary" style={{ flex: 1 }}>
                  {savingCustom ? 'Adding...' : 'Add to Plan'}
                </Button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Meal View Popup Modal */}
      {selectedMealDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedMealDetail(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '540px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header with Badges & Close Button */}
            <div style={{ position: 'relative', width: '100%', height: '220px' }}>
              <img
                src={getFoodImage(selectedMealDetail.food_name, selectedMealDetail.meal_type)}
                alt={selectedMealDetail.food_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedMealDetail(null)}
                aria-label="Close modal"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                <X size={18} />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '16px',
                  background: 'var(--surface)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--green)',
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {selectedMealDetail.meal_type.toUpperCase()} · {selectedDay.toUpperCase()}
              </div>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ fontSize: '22px', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                  {selectedMealDetail.food_name}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                  {selectedMealDetail.description || 'Nutrient-rich balanced meal formulated by AI to align with your dietary preference.'}
                </p>
              </div>

              {/* 4-Column Nutrition Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  background: 'var(--surface-subtle)',
                  padding: '14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  marginBottom: '18px',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', textTransform: 'uppercase' }}>Energy</span>
                  <strong style={{ fontSize: '17px', color: 'var(--text)' }}>{selectedMealDetail.calories}</strong>
                  <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>kcal</small>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', textTransform: 'uppercase' }}>Protein</span>
                  <strong style={{ fontSize: '17px', color: 'var(--green)' }}>{selectedMealDetail.protein}</strong>
                  <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>grams</small>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', textTransform: 'uppercase' }}>Carbs</span>
                  <strong style={{ fontSize: '17px', color: '#d79a28' }}>{selectedMealDetail.carbs}</strong>
                  <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>grams</small>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', textTransform: 'uppercase' }}>Fats</span>
                  <strong style={{ fontSize: '17px', color: 'var(--terracotta)' }}>{selectedMealDetail.fat}</strong>
                  <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>grams</small>
                </div>
              </div>

              {/* Macro Energy Distribution Bar */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                  <span>Macronutrient Ratio</span>
                  <span>
                    {Math.round((selectedMealDetail.calories / (profile?.daily_calorie_target || 2000)) * 100)}% of daily target
                  </span>
                </div>
                <div className="macro-bar" style={{ height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                  <i style={{ width: `${Math.round(((selectedMealDetail.protein * 4) / Math.max(1, selectedMealDetail.calories)) * 100)}%`, background: 'var(--green)' }} />
                  <i style={{ width: `${Math.round(((selectedMealDetail.carbs * 4) / Math.max(1, selectedMealDetail.calories)) * 100)}%`, background: '#d79a28' }} />
                  <i style={{ width: `${Math.round(((selectedMealDetail.fat * 9) / Math.max(1, selectedMealDetail.calories)) * 100)}%`, background: 'var(--terracotta)' }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  onClick={async () => {
                    await toggleMealCompletion(selectedMealDetail.id)
                    setSelectedMealDetail(prev => prev ? { ...prev, is_completed: !prev.is_completed } : null)
                  }}
                  className="btn-primary"
                  style={{ flex: 1, minWidth: '140px' }}
                >
                  <Check size={15} />
                  {selectedMealDetail.is_completed ? 'Eaten' : 'Mark as Eaten'}
                </Button>

                <button
                  type="button"
                  className="outline-button"
                  onClick={async () => {
                    await addMeal({
                      food_name: selectedMealDetail.food_name,
                      description: selectedMealDetail.description || 'Planned meal from NutriScan AI Planner',
                      calories: selectedMealDetail.calories,
                      protein: selectedMealDetail.protein,
                      carbs: selectedMealDetail.carbs,
                      fat: selectedMealDetail.fat,
                      fiber: 4,
                      sugar: 4,
                      sodium: 400,
                      serving_size: '1 serving',
                      meal_type: selectedMealDetail.meal_type,
                      image_url: null,
                      logged_at: new Date().toISOString(),
                      health_score: 80,
                    })
                    toast({
                      title: 'Logged to Diary',
                      description: `${selectedMealDetail.food_name} added to your personal diet history.`,
                    })
                  }}
                  style={{ flex: 1, minWidth: '140px', justifyContent: 'center' }}
                >
                  <BookmarkCheck size={14} /> Log to Diary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer setPage={setPage} />
    </>
  )
}

export default MealPlannerPage
