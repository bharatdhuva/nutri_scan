import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

interface PrivacyPolicyPageProps {
  setPage: (page: string) => void
}

export function PrivacyPolicyPage({ setPage }: PrivacyPolicyPageProps) {
  return (
    <>
      <main className="wrap legal-page">
        <button className="text-link" onClick={() => setPage('home')} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Home
        </button>
        <p className="kicker">PRIVACY COMMITMENT</p>
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: October 14, 2026</p>

        <div className="legal-card">
          <h2>1. Data We Collect</h2>
          <p>
            NutriScan collects photos you submit for food recognition, along with metadata such as time of meal and dietary preferences you choose to configure.
          </p>

          <h2>2. How We Use Food Images</h2>
          <p>
            Submitted meal photos are processed by our computer vision models solely to estimate ingredients, portion sizes, and nutritional values. Photos are never shared publicly or used for third-party advertising.
          </p>

          <h2>3. Storage & Security</h2>
          <p>
            All network communication is encrypted using industry-standard TLS. Your diet records remain tied strictly to your authenticated account and can be deleted at any time upon request.
          </p>

          <h2>4. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy, please reach out to{' '}
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

export default PrivacyPolicyPage
