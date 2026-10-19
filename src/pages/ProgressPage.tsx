import { useMemo } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMeals } from '@/hooks/useMeals'
import { Footer } from '@/components/layout/Footer'
import { format, parseISO, subDays } from 'date-fns'

interface ProgressPageProps {
  setPage: (page: string) => void
}

export function ProgressPage({ setPage }: ProgressPageProps) {
  const { user, profile } = useAuth()
  const { meals, todayStats, weeklyStats } = useMeals()

  const dailyTarget = profile?.daily_calorie_target || 2000
  const targetProtein = Math.round((dailyTarget * 0.25) / 4) || 125
  const targetCarbs = Math.round((dailyTarget * 0.50) / 4) || 250
  const targetFat = Math.round((dailyTarget * 0.25) / 9) || 55

  const hasMeals = meals.length > 0

  // Calculate real streak from user's logged meals
  const streak = useMemo(() => {
    if (!hasMeals) return 0
    const loggedDates = new Set(meals.map(m => format(parseISO(m.logged_at), 'yyyy-MM-dd')))
    let count = 0
    let current = new Date()

    // Check if logged today; if not, check from yesterday
    const todayStr = format(current, 'yyyy-MM-dd')
    const yesterdayStr = format(subDays(current, 1), 'yyyy-MM-dd')
    if (!loggedDates.has(todayStr) && !loggedDates.has(yesterdayStr)) {
      return 0
    }

    if (!loggedDates.has(todayStr) && loggedDates.has(yesterdayStr)) {
      current = subDays(current, 1)
    }

    while (loggedDates.has(format(current, 'yyyy-MM-dd'))) {
      count++
      current = subDays(current, 1)
    }
    return count
  }, [meals, hasMeals])

  // Real 7-day bars from weeklyStats
  const chartDays = useMemo(() => {
    if (!weeklyStats?.days || weeklyStats.days.length === 0) {
      return []
    }
    return weeklyStats.days.map((d) => {
      const dayDate = parseISO(d.date)
      const dayLabel = format(dayDate, 'EEE')
      const height = dailyTarget > 0 ? Math.min(100, Math.round((d.totalCalories / dailyTarget) * 100)) : 0
      return {
        day: dayLabel,
        kcal: d.totalCalories,
        target: dailyTarget,
        height: d.totalCalories > 0 ? Math.max(8, height) : 2,
        over: d.totalCalories > dailyTarget,
      }
    })
  }, [weeklyStats, dailyTarget])

  const avgCalories = weeklyStats?.averageCalories || todayStats?.totalCalories || 0
  const avgHealthScore = weeklyStats?.averageHealthScore || todayStats?.averageHealthScore || 0
  const avgProtein = weeklyStats?.averageProtein || todayStats?.totalProtein || 0
  const avgCarbs = weeklyStats?.averageCarbs || todayStats?.totalCarbs || 0
  const avgFat = weeklyStats?.averageFat || todayStats?.totalFat || 0

  const proteinPct = targetProtein > 0 ? Math.min(100, Math.round((avgProtein / targetProtein) * 100)) : 0
  const carbsPct = targetCarbs > 0 ? Math.min(100, Math.round((avgCarbs / targetCarbs) * 100)) : 0
  const fatPct = targetFat > 0 ? Math.min(100, Math.round((avgFat / targetFat) * 100)) : 0

  const daysWithData = (weeklyStats?.days || []).filter(d => d.mealCount > 0)
  const onTargetDays = daysWithData.filter(d => Math.abs(d.totalCalories - dailyTarget) <= 350).length
  const onTargetPct = daysWithData.length > 0 ? Math.round((onTargetDays / daysWithData.length) * 100) : 100

  return (
    <>
      <main className="wrap feature-page">
        <p className="kicker">YOUR SIGNAL & PATTERNS</p>
        <h1>Progress you can feel.</h1>
        <p className="hero-lede">
          Small consistent choices add up. Review your weekly caloric consistency, macronutrient distributions, and tracking streak.
        </p>

        {!user ? (
          /* Sign-In Required State */
          <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)', margin: '40px 0' }}>
            <h3 style={{ margin: '0 0 8px' }}>Sign in to track your progress</h3>
            <p className="muted" style={{ margin: '0 0 20px', maxWidth: '400px', marginInline: 'auto' }}>
              Your daily calorie totals, weekly trends, and nutrition streaks are securely stored in your personal account.
            </p>
            <Button onClick={() => setPage('signin')} className="btn-primary">
              Sign In to View Progress <ArrowRight size={15} />
            </Button>
          </div>
        ) : !hasMeals ? (
          /* Empty State for Fresh / New Users */
          <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-lg)', margin: '40px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface-subtle)', marginBottom: '14px', color: 'var(--green)' }}>
              <Sparkles size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px' }}>No progress logged yet</h3>
            <p className="muted" style={{ margin: '0 0 20px', maxWidth: '440px', marginInline: 'auto' }}>
              Analyze a meal and click &ldquo;Save to My Diary&rdquo; to start tracking your daily calories, weekly consistency, and nutrition streaks.
            </p>
            <Button onClick={() => setPage('analyze')} className="btn-primary">
              Analyze your first meal <ArrowRight size={15} />
            </Button>
          </div>
        ) : (
          /* Real Data for Active Users */
          <>
            {/* Top 3 Metric Cards */}
            <section className="feature-grid">
              <article className="feature-card">
                <span className="kicker">AVERAGE CALORIES</span>
                <strong className="feature-number">{avgCalories}</strong>
                <p>Average daily kcal across {meals.length} tracked {meals.length === 1 ? 'meal' : 'meals'}.</p>
              </article>
              <article className="feature-card">
                <span className="kicker">AVG HEALTH SCORE</span>
                <strong className="feature-number" style={{ color: avgHealthScore >= 70 ? 'var(--green)' : '#b45309' }}>
                  {avgHealthScore > 0 ? Math.round(avgHealthScore) : '—'}
                </strong>
                <p>Score benchmarked from nutritional density.</p>
              </article>
              <article className="feature-card">
                <span className="kicker">LOGGING STREAK</span>
                <strong className="feature-number">
                  {streak} {streak === 1 ? 'Day' : 'Days'}
                </strong>
                <p>{streak > 0 ? 'Consecutive days with logged meals.' : 'Log a meal today to begin your streak!'}</p>
              </article>
            </section>

            {/* Visual Calorie Bar Chart */}
            <section className="progress-chart-card">
              <div className="chart-header">
                <div>
                  <span className="kicker">CALORIE INTAKE VS TARGET</span>
                  <h3>Weekly Consistency (Target: {dailyTarget.toLocaleString()} kcal)</h3>
                </div>
                <span className="chart-target-badge">{onTargetPct}% On Target</span>
              </div>

              <div className="bar-chart-visual">
                <div className="chart-target-line">
                  <span>Goal: {dailyTarget.toLocaleString()} kcal</span>
                </div>
                {chartDays.map((col) => (
                  <div className="chart-col" key={col.day}>
                    <b>{col.kcal > 0 ? col.kcal : '—'}</b>
                    <div
                      className={`chart-bar-fill ${col.over ? 'over' : ''}`}
                      style={{ height: `${col.height}%` }}
                    />
                    <span>{col.day}</span>
                  </div>
                ))}
              </div>

              {/* Macro Breakdown */}
              <div className="macro-split-grid">
                <div className="macro-split-item">
                  <span>PROTEIN (AVG {avgProtein}g / {targetProtein}g TARGET)</span>
                  <strong>{proteinPct}% TARGET</strong>
                  <div className="macro-progress-bar">
                    <i style={{ width: `${proteinPct}%`, background: 'var(--green)' }} />
                  </div>
                </div>
                <div className="macro-split-item">
                  <span>CARBS (AVG {avgCarbs}g / {targetCarbs}g TARGET)</span>
                  <strong>{carbsPct}% TARGET</strong>
                  <div className="macro-progress-bar">
                    <i style={{ width: `${carbsPct}%`, background: '#d79a28' }} />
                  </div>
                </div>
                <div className="macro-split-item">
                  <span>FATS (AVG {avgFat}g / {targetFat}g TARGET)</span>
                  <strong>{fatPct}% TARGET</strong>
                  <div className="macro-progress-bar">
                    <i style={{ width: `${fatPct}%`, background: 'var(--terracotta)' }} />
                  </div>
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Button onClick={() => setPage('analyze')} className="btn-primary">
                Log another meal <ArrowRight data-icon="inline-end" size={16} />
              </Button>
              <button className="outline-button" onClick={() => setPage('history')}>
                View Meal History
              </button>
            </div>
          </>
        )}
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default ProgressPage
