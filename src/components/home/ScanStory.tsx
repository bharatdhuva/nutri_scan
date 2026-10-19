import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sampleImage = `${import.meta.env.BASE_URL}biryani-sample.png`

interface ScanStoryProps {
  setPage: (page: string) => void
}

export function ScanStory({ setPage }: ScanStoryProps) {
  return (
    <section className="scan-story wrap" aria-labelledby="scan-story-title">
      <div className="scan-story-copy">
        <p className="kicker">SEE THE SIGNAL</p>
        <h2 id="scan-story-title">From one photo to a clearer plate.</h2>
        <p>
          NutriScan analyzes the whole meal, isolates individual ingredients, and calculates accurate calories, macros, and healthy substitutions.
        </p>
        <Button onClick={() => setPage('analyze')} className="btn-primary">
          Try a live scan <ArrowRight data-icon="inline-end" size={16} />
        </Button>
      </div>
      <div className="scan-stage">
        <div className="scan-phone">
          <div className="phone-speaker" />
          <div className="phone-screen">
            <div className="scan-topline">
              <span>NutriScan AI</span>
              <span className="scan-live">
                <i /> LIVE
              </span>
            </div>
            <div className="food-frame">
              <img src={sampleImage} alt="Biryani meal being scanned" />
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />
              <span className="scan-line" />
              <span className="scan-target">
                <i /><i /><i /><i />
              </span>
              <span className="scan-pill">Scanning meal...</span>
            </div>
            <div className="scan-result">
              <span className="mini-label">MEAL IDENTIFIED</span>
              <strong>Hyderabadi Biryani</strong>
              <div className="scan-chips">
                <span>Rice</span>
                <span>Chicken</span>
                <span>Spices</span>
              </div>
            </div>
          </div>
        </div>
        <div className="scan-orbit orbit-one">
          <span>Rice · Basmati</span>
        </div>
        <div className="scan-orbit orbit-two">
          <span>538 kcal</span>
        </div>
        <div className="scan-orbit orbit-three">
          <span>Protein 26g</span>
        </div>
        <svg className="scan-doodle" viewBox="0 0 500 420" aria-hidden="true">
          <path d="M45 290c44 51 98 78 160 70 51-7 65-45 23-64-33-15-76 3-68 31 10 35 85 41 132 8 58-41 91-99 87-165" />
          <path d="M370 145l8-24 17 18 23-3-14 20 6 24-22-12-20 11 7-22z" />
        </svg>
      </div>
    </section>
  )
}

export default ScanStory
