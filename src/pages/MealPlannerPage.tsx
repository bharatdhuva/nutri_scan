import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  ChefHat,
  Clock,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  Utensils,
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

interface MealNutrientBreakdown {
  portion: string
  howMuchToEat: string
  timing: string
  proteinSource: string
  carbsSource: string
  fatSource: string
  fiberAndMicros: string
  prepTip: string
  pairing: string
}

function getMealNutrientBreakdown(
  foodName: string,
  mealType: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): MealNutrientBreakdown {
  const name = foodName.toLowerCase()
  const type = mealType.toLowerCase()

  const timing =
    type === 'breakfast'
      ? 'Breakfast · 7:30 AM – 9:30 AM'
      : type === 'lunch'
      ? 'Lunch · 12:30 PM – 2:30 PM'
      : type === 'dinner'
      ? 'Dinner · 7:30 PM – 9:30 PM'
      : 'Snack · 4:30 PM – 5:30 PM'

  // 1. Chilla / Savory Pancakes / Dosa
  if (name.includes('chilla') || name.includes('cheela') || name.includes('pancake')) {
    const hasPaneer = name.includes('paneer')
    return {
      portion: hasPaneer ? '2 medium chillas (~220g) topped with 50g grated paneer' : '2 medium chillas (~200g)',
      howMuchToEat: 'Eat 2 medium pieces. This gives you high morning satiety, replenishing amino acid reserves without causing digestive heaviness.',
      timing,
      proteinSource: hasPaneer
        ? 'Gram flour (besan) + grated low-fat paneer provide complete branched-chain amino acids (BCAAs) to prevent muscle breakdown and sustain satiety.'
        : 'Plant-based protein from nutrient-dense chickpea / gram flour (besan) supplying clean plant amino acids.',
      carbsSource: 'Slow-burning complex carbs from pulse flour that break down steadily into bloodstream glucose with zero sugar spikes.',
      fatSource: 'Healthy unsaturated lipids from paneer and light cooking oil (preferably cold-pressed or olive oil) supporting hormone balance.',
      fiberAndMicros: 'High in dietary fiber (~5g), folate, iron, magnesium, and restorative plant polyphenols.',
      prepTip: 'Cook in a non-stick or cast-iron pan using 1 tsp cold-pressed oil or A2 ghee. Fold in chopped onions, coriander, and green chilies for extra flavor.',
      pairing: 'Pair with 2 tbsp homemade mint-coriander chutney or 1 cup fresh spiced buttermilk (chaas).'
    }
  }

  // 2. Paneer dishes (Paneer Bhurji, Tikka, Curry, Palak Paneer)
  if (name.includes('paneer')) {
    return {
      portion: '1 medium bowl (~180g) with 2 whole wheat phulkas or 1 cup brown rice',
      howMuchToEat: 'Eat a 180g bowl portion. Gives an abundant protein boost without overburdening the digestive tract.',
      timing,
      proteinSource: 'Slow-digesting dairy casein protein from fresh cottage cheese (paneer), ensuring hours of continuous amino acid release.',
      carbsSource: 'Naturally low carb density; carbohydrates come from accompanying whole grains (rotis), sautéed onions, and antioxidant-rich tomatoes.',
      fatSource: 'Wholesome dairy lipids that aid the absorption of fat-soluble vitamins (A, D, E, and K) and promote hormonal balance.',
      fiberAndMicros: 'High in bioavailable calcium, phosphorus, conjugated linoleic acid (CLA), and digestive spices.',
      prepTip: 'Avoid deep frying paneer. Use pan-searing or add cubes directly into simmering tomato-onion gravy for soft texture.',
      pairing: 'Pair with a fresh cucumber-tomato salad dressed with lemon and pink Himalayan salt.'
    }
  }

  // 3. Chicken / Fish / Seafood
  if (name.includes('chicken') || name.includes('fish') || name.includes('salmon') || name.includes('prawn') || name.includes('meat')) {
    return {
      portion: '150g – 180g cooked lean portion (about the size of your palm) + 1 cup steamed grains or 2 rotis',
      howMuchToEat: 'Eat 1 palm-sized serving. Provides optimal bioavailability for post-workout muscle protein synthesis (MPS).',
      timing,
      proteinSource: '100% complete bioavailable animal protein delivering all 9 essential amino acids with high biological value.',
      carbsSource: 'Virtually zero natural carbs; carbs are provided by side grains, roasted vegetables, and aromatic gravy ingredients.',
      fatSource: 'Lean poultry fats or cardio-protective marine Omega-3 fatty acids (EPA & DHA) that reduce systemic inflammation.',
      fiberAndMicros: 'Rich in Vitamin B12, niacin, selenium, heme iron, and zinc.',
      prepTip: 'Marinate in hung curd with garlic, ginger, and turmeric; bake, grill, or slow-simmer with minimal added oil.',
      pairing: 'Pair with steamed brown basmati rice and a crunchy green salad.'
    }
  }

  // 4. Eggs / Omelette / Bhurji
  if (name.includes('egg') || name.includes('omelet') || name.includes('bhurji') || name.includes('scramble')) {
    return {
      portion: '2 whole eggs or 3 egg whites + 1 whole wheat toast or 1 roti',
      howMuchToEat: 'Eat 2 whole eggs. The yolk provides essential micronutrients and healthy fats, while the whites offer pure albumin protein.',
      timing,
      proteinSource: 'Gold-standard egg albumin protein with 100% biological score (highest protein digestibility score).',
      carbsSource: 'Near zero from eggs; supplied by whole grain toast, sautéed tomatoes, or accompanying phulka.',
      fatSource: 'Healthy phospholipids, choline, and unsaturated fats contained naturally in the egg yolk.',
      fiberAndMicros: 'Supercharged with choline (for cognitive function), lutein, zeaxanthin, and Vitamin D.',
      prepTip: 'Whisk with finely chopped green chilies, cilantro, and onions. Cook with light olive oil or ghee spray.',
      pairing: 'Pair with a side of sautéed mushrooms, spinach, or a sliced avocado.'
    }
  }

  // 5. Lentils / Dal / Chole / Rajma / Moong / Sprouts
  if (name.includes('dal') || name.includes('chole') || name.includes('rajma') || name.includes('chana') || name.includes('lentil') || name.includes('sprout')) {
    return {
      portion: '1 large katori / bowl (~200g - 250g) + 1 cup brown rice or 2 multigrain rotis',
      howMuchToEat: 'Eat 1 large bowl. High soluble fiber promotes gut satiety, stabilizes appetite, and prevents evening sugar cravings.',
      timing,
      proteinSource: 'Wholesome legume protein rich in lysine, essential for collagen synthesis and tissue repair.',
      carbsSource: 'Complex resistant starch and slow-digesting oligosaccharides that nourish beneficial gut bacteria (microbiome).',
      fatSource: 'Heart-healthy minimal tempering (tadka) using 1 tsp ghee, mustard seeds, and cumin.',
      fiberAndMicros: 'Packed with 7-9g dietary fiber, folate, potassium, magnesium, and non-heme iron.',
      prepTip: 'Soak pulses for 6–8 hours and cook with a pinch of hing (asafoetida) and ginger to ensure effortless digestion.',
      pairing: 'Squeeze half a fresh lemon right before eating; the Vitamin C enhances non-heme iron absorption by up to 300%.'
    }
  }

  // 6. Dosa / Idli / Uttapam
  if (name.includes('dosa') || name.includes('idli') || name.includes('uttapam') || name.includes('vada')) {
    return {
      portion: name.includes('idli') ? '3-4 steamed idlis + 1 large bowl vegetable sambar' : '2 medium dosas / uttapams + 1 bowl sambar',
      howMuchToEat: 'Eat 2-3 pieces with plenty of vegetable sambar. The fermentation pre-digests nutrients for instant absorption.',
      timing,
      proteinSource: 'Complementary plant proteins from fermented urad dal combined with lentil-rich vegetable sambar.',
      carbsSource: 'Naturally fermented rice and lentil carbohydrates offering quick, clean glycogen replenishment with probiotics.',
      fatSource: 'Very low fat; healthy lipids from roasted peanut or freshly grated coconut chutney.',
      fiberAndMicros: 'High in natural B-complex vitamins generated by fermentation, plus dietary fiber from sambar vegetables.',
      prepTip: 'Use a seasoned cast-iron skillet and limit oil to 1/2 tsp per piece. Pack the sambar with bottle gourd and drumsticks.',
      pairing: 'Enjoy with hot piping sambar and a spoonful of roasted chana-dal chutney.'
    }
  }

  // 7. Poha / Upma / Khichdi / Oats / Porridge
  if (name.includes('poha') || name.includes('upma') || name.includes('khichdi') || name.includes('oat') || name.includes('porridge') || name.includes('muesli')) {
    return {
      portion: '1 medium bowl (~200g - 240g)',
      howMuchToEat: 'Eat 1 moderate bowl. Enjoy slowly and chew well to allow satiety signals to register with your brain.',
      timing,
      proteinSource: 'Enhanced with roasted peanuts, green peas, sprouted legumes, or skimmed milk/curd.',
      carbsSource: 'Easily digestible carbohydrates providing clean mental alertness and physical vitality for your active day.',
      fatSource: 'Monounsaturated fats from roasted peanuts, mustard seeds, and curry leaf tempering.',
      fiberAndMicros: 'Dietary fiber, iron from flattened rice, and digestive bioactives from turmeric and mustard.',
      prepTip: 'Toss in extra diced veggies (carrots, green beans, bell peppers) to double the volume without adding excess calories.',
      pairing: 'Pair with a cup of unsweetened spiced chai or a glass of lemon-infused water.'
    }
  }

  // 8. Biryani / Pulao / Rice bowls
  if (name.includes('biryani') || name.includes('pulao') || name.includes('rice') || name.includes('grain')) {
    return {
      portion: '1 medium bowl (~220g) + 1 small bowl vegetable or cucumber raita',
      howMuchToEat: 'Eat 1 measured bowl. Pairing with cooling raita balances the spices and blunts any rapid glycemic response.',
      timing,
      proteinSource: 'Protein-packed inclusions such as marinated chicken, boiled eggs, soya chunks, or spiced paneer.',
      carbsSource: 'Aromatic long-grain basmati or brown rice delivering sustained muscular glycogen replenishment.',
      fatSource: 'Subtle aromatic spices infused with a measured spoon of ghee or cold-pressed vegetable oil.',
      fiberAndMicros: 'Antioxidants and phytonutrients from whole cardamom, cloves, star anise, saffron, and fresh mint leaves.',
      prepTip: 'Cook using brown basmati rice and layer with abundant fresh mint and sliced brown onions for authentic dum flavor.',
      pairing: 'Serve with chilled cucumber-cumin raita to aid digestion and promote gut cooling.'
    }
  }

  // 9. General / Fallback Balanced Dish
  const portionEst =
    type === 'breakfast'
      ? '1 standard serving (~200g - 220g)'
      : type === 'lunch'
      ? '1 main bowl (~250g) with 2 whole wheat rotis or grains'
      : type === 'dinner'
      ? '1 light bowl (~200g) with a side of steamed greens'
      : '1 small bowl or fistful portion (~100g - 120g)'

  return {
    portion: portionEst,
    howMuchToEat: `Eat ${portionEst}. Designed to deliver ${calories} kcal and ${protein}g protein aligned with your daily nutrition goals.`,
    timing,
    proteinSource: `Provides ${protein}g of protein to maintain positive nitrogen balance, support tissue regeneration, and preserve lean body mass.`,
    carbsSource: `Supplies ${carbs}g of energizing complex carbohydrates for steady physical stamina and brain vitality without energy dips.`,
    fatSource: `Contains ${fat}g of balanced dietary lipids essential for healthy cell membranes, hormone synthesis, and nutrient assimilation.`,
    fiberAndMicros: 'Balanced micronutrient matrix with essential vitamins, minerals, and digestive dietary fiber.',
    prepTip: 'Prepare using fresh, wholesome ingredients with minimal processed oils. Season with natural herbs and spices.',
    pairing: 'Pair with fresh greens or a cup of warm water with lemon 20 minutes before eating.'
  }
}

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
      {selectedMealDetail && (() => {
        const mealInsights = getMealNutrientBreakdown(
          selectedMealDetail.food_name,
          selectedMealDetail.meal_type,
          selectedMealDetail.calories,
          selectedMealDetail.protein,
          selectedMealDetail.carbs,
          selectedMealDetail.fat
        )

        return (
          <div className="modal-backdrop" onClick={() => setSelectedMealDetail(null)}>
            <div
              className="modal-card"
              style={{
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Image Header with Badges & Close Button */}
              <div style={{ position: 'relative', width: '100%', height: '210px', flexShrink: 0 }}>
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

              {/* Modal Content Body - Scrollable */}
              <div style={{ padding: '22px 26px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '22px', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    {selectedMealDetail.food_name}
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
                    {selectedMealDetail.description || 'Nutrient-rich balanced meal formulated by AI to align with your dietary preference.'}
                  </p>
                </div>

                {/* Portion Guidance & How Much To Eat Card */}
                <div
                  style={{
                    background: 'var(--tint)',
                    border: '1px solid rgba(46, 125, 50, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green)', fontWeight: 600, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      <Scale size={15} />
                      <span>RECOMMENDED SERVING & PORTION</span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {mealInsights.timing}
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                    Serving Size: <span style={{ color: 'var(--green)' }}>{mealInsights.portion}</span>
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.45, margin: 0 }}>
                    💡 <strong>How much to eat:</strong> {mealInsights.howMuchToEat}
                  </p>
                </div>

                {/* 4-Column Nutrition Metric Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    background: 'var(--surface-subtle)',
                    padding: '12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--line)',
                    marginBottom: '16px',
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
                <div style={{ marginBottom: '18px' }}>
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

                {/* Where the Macros Come From (Nutrient Origin Breakdown) */}
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                    Where Your Nutrients Come From
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Protein ({selectedMealDetail.protein}g)</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                        {mealInsights.proteinSource}
                      </p>
                    </div>

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d79a28' }} />
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Carbohydrates ({selectedMealDetail.carbs}g)</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                        {mealInsights.carbsSource}
                      </p>
                    </div>

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--terracotta)' }} />
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Fats & Lipids ({selectedMealDetail.fat}g)</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                        {mealInsights.fatSource}
                      </p>
                    </div>

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Dietary Fiber & Micronutrients</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                        {mealInsights.fiberAndMicros}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chef & Nutritionist Preparation Tips */}
                <div
                  style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: 'var(--muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text)', marginBottom: '5px' }}>
                    <ChefHat size={14} color="var(--green)" />
                    <span>Preparation & Pairing Guide</span>
                  </div>
                  <p style={{ margin: '0 0 5px' }}>• <strong>Preparation:</strong> {mealInsights.prepTip}</p>
                  <p style={{ margin: 0 }}>• <strong>Best Pairing:</strong> {mealInsights.pairing}</p>
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
                        serving_size: mealInsights.portion,
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
        )
      })()}

      <Footer setPage={setPage} />
    </>
  )
}

export default MealPlannerPage
