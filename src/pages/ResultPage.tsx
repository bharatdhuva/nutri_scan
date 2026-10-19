import { useState } from 'react'
import {
  ArrowRight,
  BookmarkCheck,
  ChevronDown,
  Send,
  Sparkles,
  ScanSearch,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMeals } from '@/hooks/useMeals'
import { useToast } from '@/hooks/use-toast'
import { Footer } from '@/components/layout/Footer'

import { BotAvatarSvg } from '@/components/ui/BotAvatarSvg'
import { chatWithGemini, getGeminiApiKey } from '@/lib/gemini'

interface ResultPageProps {
  analysisData: any
  setPage: (page: string) => void
}

export function ResultPage({
  analysisData,
  setPage,
}: ResultPageProps) {
  const [chatOpen] = useState(true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(true)
  const [savingMeal, setSavingMeal] = useState(false)
  const isFromHistory = Boolean(analysisData?.fromHistory)
  const [mealSaved, setMealSaved] = useState(isFromHistory)
  const [botLoading, setBotLoading] = useState(false)

  const { user } = useAuth()
  const { addMeal } = useMeals()
  const { toast } = useToast()

  // ─── Guard: If no meal analysis is present, render empty state ─────────────
  const hasAnalysis = Boolean(
    analysisData &&
    (analysisData.foodName || (typeof analysisData.calories === 'number' && analysisData.calories > 0) || analysisData.isNotFood)
  )

  if (!hasAnalysis) {
    return (
      <>
        <main className="wrap results-page">
          <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '540px', margin: '0 auto' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--tint)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <ScanSearch size={32} />
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>No meal selected</h1>
            <p className="muted" style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
              To view nutritional facts, macronutrient breakdowns, and AI health verdicts, analyze a food photo or select any meal from your diet history.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button onClick={() => setPage('analyze')} className="btn-primary">
                <Sparkles size={16} /> Analyze a Meal
              </Button>
              <Button onClick={() => setPage('history')} variant="outline" className="outline-button">
                View Diet History <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </main>
        <Footer setPage={setPage} />
      </>
    )
  }

  // ─── Detect non-food result ───────────────────────────────────────────────
  const rawDishName = analysisData?.foodName || 'Meal'
  const isNotFood =
    !isFromHistory &&
    (
      Boolean(analysisData?.isNotFood) ||
      rawDishName.toLowerCase() === 'not food' ||
      rawDishName.toLowerCase().includes('not food') ||
      rawDishName.toLowerCase().includes('no food') ||
      /passport|person|portrait|selfie|face|document|screenshot/i.test(rawDishName) ||
      (analysisData?.calories === 0 && (analysisData?.protein ?? 0) === 0)
    )

  const dishName = isNotFood ? 'No Food Detected' : rawDishName
  const calories = Number(analysisData?.calories) || 0
  const protein = Number(analysisData?.protein) || 0
  const carbs = Number(analysisData?.carbs) || 0
  const fat = Number(analysisData?.fat) || 0
  const fiber = Number(analysisData?.fiber) || 0
  const sugar = Number(analysisData?.sugar) || 0
  const sodium = Number(analysisData?.sodium) || 0
  const healthScore = typeof analysisData?.healthScore === 'object'
    ? (Number(analysisData?.healthScore?.score) || 70)
    : (Number(analysisData?.healthScore) || 70)
  
  // NEVER leak unrelated last image if opened from history
  const uploadedPhoto =
    analysisData?.imageUrl ||
    (!isFromHistory && typeof window !== 'undefined'
      ? sessionStorage.getItem('nutriscan_last_image')
      : null)
  const image = uploadedPhoto || null
  const confidence = analysisData?.confidence ?? 95

  const foodContext = {
    foodName: dishName,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    healthScore,
    servingSize: analysisData?.servingSize || '1 serving',
    description: analysisData?.description || '',
  }

  // Dynamic dish-specific verdict and optimization suggestions
  const fallbackOptimization = getFoodOptimizations(dishName, calories, protein, carbs, fat, sugar, fiber, sodium)

  const verdict =
    analysisData?.healthScore?.explanation ||
    fallbackOptimization.verdict

  const suggestions: string[] =
    (Array.isArray(analysisData?.healthScore?.suggestions) && analysisData.healthScore.suggestions.length > 0)
      ? analysisData.healthScore.suggestions
      : (Array.isArray(analysisData?.healthTips) && analysisData.healthTips.length > 0)
        ? analysisData.healthTips
        : fallbackOptimization.tips

  const initialBotMsg = isNotFood
    ? `No food was detected in this image. ${analysisData?.description || 'Please upload a photo of a food item to get nutritional analysis.'}`
    : isFromHistory
      ? `Viewing your logged meal: ${dishName}.\n\n• Energy: ${calories} kcal\n• Protein: ${protein}g · Carbs: ${carbs}g · Fat: ${fat}g\n• Health Score: ${healthScore}/100`
      : `I've analyzed your ${dishName}.\n\n• Energy: ${calories} kcal\n• Protein: ${protein}g · Carbs: ${carbs}g · Fat: ${fat}g\n• Health Score: ${healthScore}/100`

  const [messages, setMessages] = useState([
    { sender: 'bot', text: initialBotMsg }
  ])
  const [inputText, setInputText] = useState('')

  const handleSaveToDiary = async () => {
    if (isFromHistory || mealSaved) {
      toast({
        title: 'Already in Diary',
        description: `${dishName} is already saved in your diet history.`,
      })
      return
    }
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save this meal to your personal diet history.',
        variant: 'destructive',
      })
      setPage('signin')
      return
    }

    setSavingMeal(true)
    try {
      // Create a fast, lightweight thumbnail from the scanned photo so history displays the actual image
      let savedImageUrl: string | null = null
      const photoToSave = uploadedPhoto || analysisData?.imageUrl
      if (photoToSave) {
        try {
          savedImageUrl = await createOptimizedThumbnail(photoToSave, 360)
        } catch {
          savedImageUrl = photoToSave
        }
      }

      await addMeal({
        food_name: dishName,
        description: analysisData?.description || 'Scanned meal with AI nutrition estimation',
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        fiber: Number(fiber),
        sugar: Number(sugar),
        sodium: Number(sodium),
        serving_size: analysisData?.servingSize || '1 serving',
        meal_type: 'lunch',
        image_url: savedImageUrl,
        logged_at: new Date().toISOString(),
        health_score: Number(healthScore),
      })
      setMealSaved(true)
      toast({
        title: 'Meal saved!',
        description: `${dishName} has been recorded into your diet history.`,
      })
    } catch (err: any) {
      toast({
        title: 'Error saving meal',
        description: err?.message || 'Failed to record meal to database',
        variant: 'destructive',
      })
    } finally {
      setSavingMeal(false)
    }
  }

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText
    if (!text.trim() || botLoading) return

    const newMessages = [...messages, { sender: 'user', text }]
    setMessages(newMessages)
    setInputText('')
    setBotLoading(true)

    try {
      const hasKey = Boolean(getGeminiApiKey())
      let botReply: string

      if (hasKey && !isNotFood) {
        // Real Gemini reply
        const geminiReply = await chatWithGemini(text, foodContext)
        botReply = geminiReply || getFallbackReply(text, dishName, calories, protein)
      } else {
        // Fallback if no API key or not-food scan
        botReply = isNotFood
          ? 'No food was detected. Please scan a food image to get nutritional insights and advice.'
          : getFallbackReply(text, dishName, calories, protein)
      }

      setMessages([...newMessages, { sender: 'bot', text: botReply }])
    } finally {
      setBotLoading(false)
    }
  }

  const macrosList = calories > 0 ? [
    ['Protein', `${protein}g`, `${protein * 4} kcal`, `${Math.round((protein * 4 / calories) * 100)}%`, 'green'],
    ['Carbs', `${carbs}g`, `${carbs * 4} kcal`, `${Math.round((carbs * 4 / calories) * 100)}%`, 'amber'],
    ['Fat', `${fat}g`, `${fat * 9} kcal`, `${Math.round((fat * 9 / calories) * 100)}%`, 'orange'],
    ['Fiber', `${fiber}g`, '—', '12%', 'green'],
    ['Sugar', `${sugar}g`, '—', '8%', 'orange'],
  ] : []

  return (
    <>
      <main className="wrap results-page">
        <div className="results-top">
          <div>
            <p className="kicker">ANALYSIS COMPLETE</p>
            <h1>{isNotFood ? 'No Food Detected.' : 'Your meal, broken down.'}</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="text-link" onClick={() => setPage('analyze')}>
              Analyze another food <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="results-layout">
          {/* Main Results Column */}
          <div className="main-results">

            {/* ── NOT-FOOD STATE ── */}
            {isNotFood ? (
              <section className="dish-intro" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 24px', gap: '20px' }}>
                {image && (
                  <img
                    src={image}
                    alt="Uploaded image"
                    style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '12px', opacity: 0.8 }}
                  />
                )}
                <div>
                  <div className="tag" style={{ justifyContent: 'center', marginBottom: '12px' }}>
                    <ScanSearch size={12} /> {confidence}% AI confidence
                  </div>
                  <h2 style={{ color: 'var(--muted)' }}>No Food Found</h2>
                  <p style={{ maxWidth: '420px', margin: '8px auto 0' }}>
                    {analysisData?.description || 'The uploaded image doesn\'t appear to contain any food items. Please try again with a photo of a meal, snack, or drink.'}
                  </p>
                </div>
                <Button className="btn-primary" onClick={() => setPage('analyze')}>
                  <ArrowRight size={16} /> Try Another Photo
                </Button>
              </section>
            ) : (
              <>
                {/* Dish Overview */}
                <section className="dish-intro">
                  {image && (
                    <img
                      src={image}
                      alt={dishName}
                    />
                  )}
                  <div>
                    <div className="tag">
                      <Sparkles size={12} /> {confidence}% AI confidence
                    </div>
                    <h2>{dishName}</h2>
                    <p>{analysisData?.description || 'Authentic dish deconstructed into individual ingredients, portion weights, and macro breakdown.'}</p>
                    <span className="muted" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                      Portion: {analysisData?.servingSize || '1 serving (approx 300g)'}
                    </span>
                  </div>
                </section>

                {/* Total Energy Label */}
                <section className="nutrition-label">
                  <div className="label-title">TOTAL ENERGY</div>
                  <div className="big-number">
                    {calories} <small>kcal</small>
                  </div>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                    {Math.round((calories / 2000) * 100)}% of your recommended 2,000 kcal daily target
                  </p>
                  <div className="macro-bar">
                    <i style={{ width: `${Math.round((protein * 4 / calories) * 100)}%` }} />
                    <i style={{ width: `${Math.round((carbs * 4 / calories) * 100)}%` }} />
                    <i style={{ width: `${Math.round((fat * 9 / calories) * 100)}%` }} />
                  </div>
                  <div className="bar-legend">
                    <span>Protein <b>{protein}g · {protein * 4} kcal</b></span>
                    <span>Carbs <b>{carbs}g · {carbs * 4} kcal</b></span>
                    <span>Fat <b>{fat}g · {fat * 9} kcal</b></span>
                  </div>
                </section>

                {/* Macronutrient Table */}
                <section className="macro-table">
                  <div className="table-head">
                    <span>MACRONUTRIENT</span>
                    <span>AMOUNT</span>
                    <span>CALORIES</span>
                    <span>% ENERGY</span>
                  </div>
                  {macrosList.map(([name, amount, kcal, pct, color]) => (
                    <div className="macro-row" key={name}>
                      <strong>{name}</strong>
                      <b>{amount}</b>
                      <span>{kcal}</span>
                      <div>
                        <span>{pct}</span>
                        <i className={color} style={{ width: pct }} />
                      </div>
                    </div>
                  ))}
                </section>

                {/* Sodium and Micronutrients */}
                <section className="sodium-row">
                  <div>
                    <span className="label-small">SODIUM ESTIMATE</span>
                    <strong>{sodium} mg</strong>
                  </div>
                  <span className="status moderate">Moderate</span>
                  <div className="line-bar">
                    <i style={{ width: `${Math.min(100, Math.round((sodium / 2300) * 100))}%` }} />
                  </div>
                  <small>{Math.round((sodium / 2300) * 100)}% of recommended daily limit (2,300 mg)</small>
                </section>

                {/* Health Score Accordion */}
                <section className="health-section">
                  <button className="collapse-head" onClick={() => setHealthOpen(!healthOpen)}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>HEALTH SCORE BREAKDOWN</span>
                    <span className="status moderate">
                      Score {healthScore}/100 <ChevronDown className={healthOpen ? 'rotate' : ''} />
                    </span>
                  </button>
                  {healthOpen && (
                    <div className="health-body">
                      <div className="score-number">
                        {healthScore} <small>/ 100</small>
                      </div>
                      <p>
                        <strong>Nutritional verdict:</strong> {verdict}
                      </p>
                      <div className="improve">
                        <strong style={{ fontSize: '14px' }}>How to optimize this meal:</strong>
                        <ol>
                          {suggestions.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </section>

                {/* Result Actions */}
                <div className="result-actions">
                  <Button
                    onClick={handleSaveToDiary}
                    disabled={savingMeal || mealSaved}
                    className="btn-primary"
                  >
                    {mealSaved ? (
                      <>
                        <BookmarkCheck size={16} /> Saved to Diary
                      </>
                    ) : (
                      <>
                        <BookmarkCheck size={16} /> Save to My Diary
                      </>
                    )}
                  </Button>
                  <button className="outline-button" onClick={() => setPage('planner')}>
                    Open AI Meal Planner
                  </button>
                  <button className="outline-button" onClick={() => setPage('history')}>
                    View Diet History
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop NutriBot Sidebar */}
          <aside className={`nutribot ${chatOpen ? '' : 'closed'}`}>
            <div className="bot-head">
              <div>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  NutriBot AI
                  <BotAvatarSvg size={22} color="var(--green)" />
                </b>
                <span>{isNotFood ? 'No food detected' : `Ask about ${dishName}`}</span>
              </div>
            </div>
            {!isNotFood && (
              <div className="question-scroll">
                <button onClick={() => sendMessage('How to burn these calories?')}>How to burn this?</button>
                <button onClick={() => sendMessage('Is this good for weight loss?')}>Weight loss friendly?</button>
                <button onClick={() => sendMessage('How can I add more protein?')}>Boost protein</button>
              </div>
            )}
            <div className="messages">
              {messages.map((m, idx) => (
                <div key={idx} className={m.sender === 'bot' ? 'bot-message' : 'user-message'}>
                  {m.sender === 'bot' && (
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BotAvatarSvg size={15} color="var(--green)" />
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>NutriBot</span>
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {botLoading && (
                <div className="bot-message">
                  <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BotAvatarSvg size={15} color="var(--green)" />
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>NutriBot</span>
                  </div>
                  <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Thinking…</span>
                </div>
              )}
            </div>
            <div className="chat-input">
              <input
                placeholder={isNotFood ? 'Scan a food image first…' : 'Ask anything about this meal...'}
                value={inputText}
                disabled={isNotFood || botLoading}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              />
              <button onClick={() => sendMessage()} type="button" disabled={isNotFood || botLoading}>
                <Send size={15} />
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Floating Chat Button */}
      <button className="mobile-chat-trigger" onClick={() => setMobileChatOpen(true)}>
        <BotAvatarSvg size={18} color="#ffffff" /> Ask NutriBot
      </button>

      {/* Mobile NutriBot Bottom Drawer */}
      {mobileChatOpen && (
        <>
          <div className="mobile-drawer-backdrop" onClick={() => setMobileChatOpen(false)} />
          <aside className="nutribot mobile-open">
            <div className="bot-head">
              <div>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  NutriBot AI
                  <BotAvatarSvg size={22} color="var(--green)" />
                </b>
                <span>{isNotFood ? 'No food detected' : `Ask about ${dishName}`}</span>
              </div>
              <button onClick={() => setMobileChatOpen(false)} aria-label="Close chat">
                <X size={20} />
              </button>
            </div>
            {!isNotFood && (
              <div className="question-scroll">
                <button onClick={() => sendMessage('How to burn these calories?')}>How to burn this?</button>
                <button onClick={() => sendMessage('Is this good for weight loss?')}>Weight loss?</button>
                <button onClick={() => sendMessage('Boost protein')}>Boost protein</button>
              </div>
            )}
            <div className="messages">
              {messages.map((m, idx) => (
                <div key={idx} className={m.sender === 'bot' ? 'bot-message' : 'user-message'}>
                  {m.sender === 'bot' && (
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BotAvatarSvg size={15} color="var(--green)" />
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>NutriBot</span>
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {botLoading && (
                <div className="bot-message">
                  <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BotAvatarSvg size={15} color="var(--green)" />
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>NutriBot</span>
                  </div>
                  <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Thinking…</span>
                </div>
              )}
            </div>
            <div className="chat-input">
              <input
                placeholder={isNotFood ? 'Scan a food image first…' : 'Ask anything...'}
                value={inputText}
                disabled={isNotFood || botLoading}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              />
              <button onClick={() => sendMessage()} type="button" disabled={isNotFood || botLoading}>
                <Send size={15} />
              </button>
            </div>
          </aside>
        </>
      )}

      <Footer setPage={setPage} />
    </>
  )
}

// ── Dynamic Dish-Specific Health Optimizer & Verdict ──────────────────────────
function getFoodOptimizations(
  dishName: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  sugar: number,
  fiber: number,
  sodium: number
): { verdict: string; tips: string[] } {
  const name = dishName.toLowerCase()

  // 1. Chocolates, Candies, Brownies & Sweet Confectioneries (Kit Kat, Chocolate, Cake, Ice cream, etc.)
  if (
    name.includes('chocolate') ||
    name.includes('kit kat') ||
    name.includes('kitkat') ||
    name.includes('candy') ||
    name.includes('brownie') ||
    name.includes('cake') ||
    name.includes('ice cream') ||
    name.includes('cookie') ||
    name.includes('sweet') ||
    name.includes('dessert') ||
    sugar > 18
  ) {
    return {
      verdict: `${dishName} is a calorie-dense treat with elevated sugars (${sugar || 'elevated'}g) and saturated fats (${fat}g). Best enjoyed mindfully as an occasional treat.`,
      tips: [
        'Practice portion moderation: enjoy 1–2 fingers or a small portion to satisfy cravings without spiking insulin.',
        'Pair with a handful of raw almonds or walnuts to add healthy fats and fiber that slow down glucose absorption.',
        'Consider dark cocoa variations (70%+ cacao) for rich antioxidant flavonoids with significantly less refined sugar.',
      ],
    }
  }

  // 2. Fried Street Food / Snacks (Vada Pav, Samosa, Pakora, Fries, Burger, etc.)
  if (
    name.includes('vada') ||
    name.includes('vadapav') ||
    name.includes('samosa') ||
    name.includes('pakora') ||
    name.includes('fry') ||
    name.includes('fries') ||
    name.includes('burger') ||
    name.includes('patty') ||
    (fat > 14 && carbs > 30)
  ) {
    return {
      verdict: `${dishName} delivers fast energy (${calories} kcal) but contains elevated frying oils (${fat}g fat) and refined carbs with modest protein (${protein}g).`,
      tips: [
        'Ask for an air-fried or baked preparation of the potato patty to slash deep-frying oils by up to 70%.',
        'Opt for whole-wheat or multigrain pav/buns instead of refined white bread for longer-lasting satiety.',
        'Pair with a cold glass of spiced buttermilk (chaas) or sprouted moong chaat to raise total meal protein to 15g+.',
      ],
    }
  }

  // 3. Rice, Noodles & Grain Staples (Rajma Chawal, Biryani, Pulao, Maggi, Ramen, Pasta)
  if (
    name.includes('rajma') ||
    name.includes('chawal') ||
    name.includes('rice') ||
    name.includes('biryani') ||
    name.includes('noodle') ||
    name.includes('maggi') ||
    name.includes('pasta') ||
    name.includes('ramen')
  ) {
    return {
      verdict: `${dishName} provides wholesome comfort and sustained energy (${carbs}g carbs). Balancing grain-to-protein ratio enhances metabolic impact.`,
      tips: [
        'Increase the ratio of beans, dal, or paneer relative to the rice to elevate protein density and fullness.',
        'Swap half the white rice for fiber-rich brown rice, quinoa, or vegetable cauliflower rice.',
        'Add a crunchy side of sliced cucumbers, tomatoes, and lemon to slow down carbohydrate digestion.',
      ],
    }
  }

  // 4. Pizza & Cheesy Dishes
  if (name.includes('pizza') || name.includes('cheese')) {
    return {
      verdict: `Offers hearty taste but contains concentrated saturated fat and sodium (${sodium}mg).`,
      tips: [
        'Choose thin whole-wheat crust loaded with fibrous vegetables (bell peppers, onions, mushrooms).',
        'Request light cheese and add grilled chicken or tofu toppings for higher protein-to-calorie ratio.',
        'Dab off excess surface oil with a napkin and drink water to offset dietary sodium.',
      ],
    }
  }

  // 5. High Protein Dishes (Chicken, Fish, Eggs, Paneer, Tofu)
  if (protein >= 20 || name.includes('chicken') || name.includes('paneer') || name.includes('egg') || name.includes('fish') || name.includes('tofu')) {
    return {
      verdict: `Great muscle-building protein density (${protein}g protein) with strong satiety and metabolic thermogenesis.`,
      tips: [
        'Use minimal cooking oil (olive or mustard oil) to keep saturated fat controlled.',
        'Complement with steamed greens (broccoli, spinach, or green beans) for essential vitamins and fiber.',
        'Stay well hydrated with water to support efficient protein synthesis and kidney function.',
      ],
    }
  }

  // 6. General Balanced Dishes
  return {
    verdict: `Delivers ${calories} kcal with ${protein}g protein, ${carbs}g carbs, and ${fat}g fats for daily energy maintenance.`,
    tips: [
      'Fill half your plate with colorful vegetables or salad to maximize micronutrient density.',
      'Control cooking oils, gravies, and added sugars to match your daily calorie target.',
      'Drink a glass of water 20 minutes before meals to naturally support digestion and portion control.',
    ],
  }
}

// ── Fallback replies when no API key is configured ──────────────────────────
function getFallbackReply(text: string, dishName: string, calories: number, protein: number): string {
  const q = text.toLowerCase()
  if (q.includes('burn')) {
    return `To burn approximately ${calories} kcal from ${dishName}: try 35 minutes of brisk walking, 25 minutes of cycling, or 20 minutes of jogging.`
  }
  if (q.includes('loss') || q.includes('diet')) {
    return `For weight loss, ${dishName} can fit into your plan. Pair it with a high-fiber salad with lemon dressing to enhance satiety and slow gastric emptying.`
  }
  if (q.includes('protein')) {
    return `${dishName} provides ${protein}g of protein per serving. Adding a boiled egg, grilled paneer, or a handful of roasted chickpeas can significantly boost your intake.`
  }
  return `Great question about ${dishName}! Based on its ${calories} kcal and ${protein}g protein, it's a balanced option. Try pairing it with vegetables to maximize nutritional value.`
}

// ── Fast client-side image thumbnail compressor ─────────────────────────────
async function createOptimizedThumbnail(dataUrl: string, maxDimension = 360): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default ResultPage
