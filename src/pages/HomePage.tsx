import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SampleLabel } from '@/components/home/SampleLabel'
import { ScanStory } from '@/components/home/ScanStory'
import { Footer } from '@/components/layout/Footer'

interface HomePageProps {
  setPage: (page: string) => void
}

export function HomePage({ setPage }: HomePageProps) {
  return (
    <>
      <main id="top">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="kicker">NUTRITION, MADE VISIBLE</p>
            <h1>
              Point your camera at dinner.<br />
              <em>Know what&apos;s in it.</em>
            </h1>
            <p className="hero-lede">
              Photograph any dish and get a clear, accurate breakdown of calories, macros, ingredients, and actionable health recommendations.
            </p>
            <div className="actions">
              <Button onClick={() => setPage('analyze')} className="btn-primary">
                Analyze a meal <ArrowRight data-icon="inline-end" size={16} />
              </Button>
              <button className="text-link" onClick={() => setPage('results')}>
                See sample result <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <SampleLabel />
        </section>

        <ScanStory setPage={setPage} />

        {/* How It Works Section */}
        <section className="wrap" style={{ paddingBottom: '80px', paddingTop: '20px' }}>
          <p className="kicker">HOW IT WORKS</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 42px)', margin: '14px 0 36px', letterSpacing: '-0.03em' }}>
            Three simple steps to nutrition clarity.
          </h2>
          <div className="feature-grid" style={{ margin: '0' }}>
            <div className="feature-card">
              <span className="kicker">STEP 01</span>
              <h2>Snap or Upload</h2>
              <p>Take a quick photo of your plate from your phone camera or upload a saved meal photo.</p>
            </div>
            <div className="feature-card">
              <span className="kicker">STEP 02</span>
              <h2>AI Deconstructs</h2>
              <p>Our vision model identifies individual dishes, estimates portion volume, and resolves ingredients.</p>
            </div>
            <div className="feature-card">
              <span className="kicker">STEP 03</span>
              <h2>Get Clear Signal</h2>
              <p>Receive your personalized nutrition label, macro percentages, and practical meal adjustments.</p>
            </div>
          </div>
        </section>

        <section className="cta wrap">
          <div>
            <p className="kicker">READY WHEN YOU ARE</p>
            <h2>Make your next meal a little clearer.</h2>
          </div>
          <Button onClick={() => setPage('analyze')} className="btn-primary">
            Analyze a meal <ArrowRight data-icon="inline-end" size={16} />
          </Button>
        </section>
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default HomePage
