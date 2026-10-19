import { ShieldCheck } from 'lucide-react'

const sampleImage = `${import.meta.env.BASE_URL}biryani-sample.png`

export function SampleLabel() {
  return (
    <div className="sample-result">
      <div className="sample-photo">
        <img src={sampleImage} alt="Hyderabadi biryani in a copper bowl" />
        <span>Hyderabadi Biryani</span>
      </div>
      <div className="label-copy">
        <div className="kicker">SAMPLE RESULT</div>
        <h2>Hyderabadi Biryani</h2>
        <p className="muted" style={{ fontSize: '13px', margin: '4px 0 12px' }}>
          Chicken biryani with fragrant basmati rice, saffron, and whole spices.
        </p>
        <div className="rule thick" />
        <div className="energy-row">
          <div>
            <span className="label-small">TOTAL ENERGY</span>
            <strong>538</strong>
            <span>kcal / serving (350g)</span>
          </div>
          <div className="score">
            <span>HEALTH SCORE</span>
            <strong>68</strong>
            <small>/ 100</small>
          </div>
        </div>
        <div className="rule" />
        <div className="macro-grid">
          <div>
            <b>26g</b>
            <span>Protein</span>
          </div>
          <div>
            <b>62g</b>
            <span>Carbs</span>
          </div>
          <div>
            <b>18g</b>
            <span>Fat</span>
          </div>
        </div>
        <div className="rule" />
        <div className="label-note">
          <ShieldCheck size={14} /> Analysed instantly with Indian portion estimation.
        </div>
      </div>
    </div>
  )
}

export default SampleLabel
