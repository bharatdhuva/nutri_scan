import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

interface TermsPageProps {
  setPage: (page: string) => void
}

export function TermsPage({ setPage }: TermsPageProps) {
  return (
    <>
      <main className="wrap legal-page">
        <button className="text-link" onClick={() => setPage('home')} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Home
        </button>
        <p className="kicker">USER AGREEMENT</p>
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: October 14, 2026</p>

        <div className="legal-card">
          <h2>1. Educational Purpose Only</h2>
          <p>
            NutriScan provides nutritional estimations and food recognition for general educational and lifestyle awareness. It is not medical software and does not replace medical advice or clinical diagnosis.
          </p>

          <h2>2. Accuracy of Estimations</h2>
          <p>
            While our AI algorithms leverage extensive datasets of Indian and international cuisine, actual portion sizes, sodium levels, and ingredient recipes may vary based on preparation methods.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>
            You agree not to upload inappropriate, offensive, or non-food content to the recognition service.
          </p>

          <h2>4. Inquiries</h2>
          <p>
            For inquiries regarding terms, contact{' '}
            <a href="mailto:alwaysdaya123@gmail.com" style={{ color: 'var(--green)', textDecoration: 'underline' }}>
              alwaysdaya123@gmail.com
            </a>.
          </p>
        </div>
      </main>
      <Footer setPage={setPage} />
    </>
  )
}

export default TermsPage
