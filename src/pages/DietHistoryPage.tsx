import { useState, useMemo } from 'react'
import {
  ArrowRight,
  Download,
  Search,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeals } from '@/hooks/useMeals'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { Footer } from '@/components/layout/Footer'

interface DietHistoryPageProps {
  setPage: (page: string) => void
  onViewMealLabel?: (mealData: any) => void
}

export function DietHistoryPage({ setPage, onViewMealLabel }: DietHistoryPageProps) {
  const { user, loading: authLoading } = useAuth()
  const { meals, deleteMeal, loading } = useMeals()
  const { toast } = useToast()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Only show authentic user logged meals from Supabase, using only the actual scanned image
  const displayMeals = useMemo(() => {
    return meals.map(m => ({
      id: m.id,
      title: m.food_name,
      time: format(parseISO(m.logged_at), 'MMM dd, yyyy · h:mm a'),
      calories: m.calories,
      score: m.health_score || 70,
      img: m.image_url || null,
      macros: `${m.protein || 0}g P · ${m.carbs || 0}g C · ${m.fat || 0}g F`,
      raw: m
    }))
  }, [meals])

  const handleViewMealLabel = (item: typeof displayMeals[0]) => {
    const raw = item.raw
    const mealAnalysis = {
      foodName: raw.food_name || item.title || 'Logged Meal',
      description: raw.description || `${raw.food_name} from your logged diary.`,
      calories: Number(raw.calories) || 0,
      protein: Number(raw.protein) || 0,
      carbs: Number(raw.carbs) || 0,
      fat: Number(raw.fat) || 0,
      fiber: Number(raw.fiber) || 0,
      sugar: Number(raw.sugar) || 0,
      sodium: Number(raw.sodium) || 0,
      servingSize: raw.serving_size || '1 serving',
      healthScore: {
        score: raw.health_score ?? 70,
        status: (raw.health_score ?? 70) >= 80 ? 'Optimal' : (raw.health_score ?? 70) >= 60 ? 'Moderate' : 'Caution',
        explanation: raw.description || `Logged meal: ${raw.food_name}`,
      },
      imageUrl: raw.image_url || item.img || null,
      confidence: 98,
      fromHistory: true,
      id: raw.id,
    }

    if (onViewMealLabel) {
      onViewMealLabel(mealAnalysis)
    } else {
      setPage('results')
    }
  }

  const filteredMeals = displayMeals.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase())
    if (filter === 'today') return matchesSearch && isToday(parseISO(m.raw.logged_at))
    if (filter === 'yesterday') return matchesSearch && isYesterday(parseISO(m.raw.logged_at))
    return matchesSearch
  })

  const triggerExport = () => {
    const headers = 'Dish Name,Timestamp,Calories,Protein,Carbs,Fat,Health Score\n'
    const rows = filteredMeals
      .map(m => `"${m.title}","${m.time}",${m.calories},"${m.macros}",${m.score}`)
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nutriscan_diet_history_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Diet history exported',
      description: 'Downloaded CSV file with all logged meals and nutritional details.',
    })
  }

  const handleDelete = async (id: string, isSample: boolean) => {
    if (isSample) {
      toast({
        title: 'Sample item',
        description: 'Log your own food scans to manage custom diary items.',
      })
      return
    }
    await deleteMeal(id)
    toast({
      title: 'Meal removed',
      description: 'The meal has been deleted from your history.',
    })
  }

  return (
    <>
      <main className="wrap feature-page">
        <p className="kicker">YOUR MEALS & ARCHIVE</p>
        <h1>A clearer food history.</h1>
        <p className="hero-lede">
          Review recent food scans, filter by date, and export your logged nutritional records to CSV.
        </p>

        {/* Search & Filter Bar */}
        <div className="history-controls">
          <div className="history-search">
            <Search />
            <input
              placeholder="Search logged meals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            {['all', 'today', 'yesterday'].map((f) => (
              <button
                key={f}
                className={`filter-pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <button className="outline-button" onClick={triggerExport} style={{ height: '42px', fontSize: '13px' }}>
            <Download size={15} /> Export CSV
          </button>
        </div>

        {/* Meal History Items */}
        <section className="history-list">
          {authLoading || loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                margin: '0 auto 14px',
                border: '3px solid var(--line)',
                borderTopColor: 'var(--green)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>Loading your meal diary...</h3>
              <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
                Fetching your saved food scans and nutritional history.
              </p>
            </div>
          ) : !user ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ margin: '0 0 8px' }}>Sign in to view your history</h3>
              <p className="muted" style={{ margin: '0 0 20px', maxWidth: '380px', marginInline: 'auto' }}>
                Your analyzed meals and nutritional records are securely saved to your account.
              </p>
              <Button onClick={() => setPage('signin')} className="btn-primary">
                Sign In to View Diary <ArrowRight size={15} />
              </Button>
            </div>
          ) : filteredMeals.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ margin: '0 0 8px' }}>No meals recorded yet</h3>
              <p className="muted" style={{ margin: '0 0 20px' }}>
                Analyze a photo of your meal to start building your personal diet diary.
              </p>
              <Button onClick={() => setPage('analyze')} className="btn-primary">
                Analyze your first meal <ArrowRight size={15} />
              </Button>
            </div>
          ) : (
            filteredMeals.map((item) => (
              <article className="history-card" key={item.id}>
                {item.img ? (
                  <img
                    src={item.img}
                    alt={item.title}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewMealLabel(item)}
                    title="Click to view detailed nutrition label"
                  />
                ) : (
                  <div
                    className="history-card-placeholder"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewMealLabel(item)}
                    title="Click to view detailed nutrition label"
                  >
                    <UtensilsCrossed size={22} />
                  </div>
                )}
                <div
                  className="history-card-content"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewMealLabel(item)}
                  title="Click to view detailed nutrition label"
                >
                  <span className="kicker">{item.time}</span>
                  <h2>{item.title}</h2>
                  <div className="history-card-stats">
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.calories} kcal</span>
                    <span>•</span>
                    <span className="status" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      Score {item.score}/100
                    </span>
                    <span>•</span>
                    <span>{item.macros}</span>
                  </div>
                </div>
                <div className="history-card-actions">
                  <button className="text-link" onClick={() => handleViewMealLabel(item)}>
                    View Label <ArrowRight size={14} />
                  </button>
                  {item.raw && (
                    <button
                      onClick={() => handleDelete(item.id, !item.raw)}
                      style={{ border: 0, background: 'none', color: '#991b1b', padding: '6px' }}
                      title="Delete meal"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>

        {user && filteredMeals.length > 0 && (
          <Button onClick={() => setPage('analyze')} className="btn-primary">
            Analyze a new meal <ArrowRight data-icon="inline-end" size={16} />
          </Button>
        )}
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default DietHistoryPage
