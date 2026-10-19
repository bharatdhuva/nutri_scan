import {
  Bot,
  Box,
  Calendar,
  Camera,
  Cloud,
  Code2,
  Compass,
  Cpu,
  Database,
  Eye,
  Flame,
  History,
  Palette,
  ScanLine,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

interface FooterProps {
  setPage: (page: string) => void
}

export function Footer({ setPage }: FooterProps) {
  const go = (nextPage: string) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="footer">
      <div className="footer-main">
        {/* NutriScan brand & summary */}
        <div>
          <div className="wordmark">
            <span className="leaf-dot" />
            NutriScan
          </div>
          <p>
            AI-powered food recognition and calorie estimation for smarter, healthier eating decisions.
          </p>
        </div>

        {/* Explore navigation with icons */}
        <div>
          <h3>
            <Compass size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            Explore
          </h3>
          <a href="#analyze" onClick={(e) => { e.preventDefault(); go('analyze') }} className="footer-link-with-icon">
            <Camera size={14} /> Food Recognition
          </a>
          <a href="#planner" onClick={(e) => { e.preventDefault(); go('planner') }} className="footer-link-with-icon">
            <Calendar size={14} /> AI Meal Planner
          </a>
          <a href="#progress" onClick={(e) => { e.preventDefault(); go('progress') }} className="footer-link-with-icon">
            <TrendingUp size={14} /> Progress Tracking
          </a>
          <a href="#history" onClick={(e) => { e.preventDefault(); go('history') }} className="footer-link-with-icon">
            <History size={14} /> Diet History & Export
          </a>
        </div>

        {/* AI Subject Project with icons */}
        <div>
          <h3>
            <Cpu size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            AI Project
          </h3>
          <span className="footer-item">
            <Eye size={14} /> Multimodal Vision
          </span>
          <span className="footer-item">
            <ScanLine size={14} /> Food Contour Recognition
          </span>
          <span className="footer-item">
            <Box size={14} /> Portion & Volume Inference
          </span>
          <span className="footer-item">
            <Bot size={14} /> NutriBot AI Assistant
          </span>
          <span className="footer-item">
            <Flame size={14} /> Mifflin-St Jeor Engine
          </span>
        </div>

        {/* Technologies with icons */}
        <div>
          <h3>
            <Code2 size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            Technologies
          </h3>
          <span className="footer-item">
            <Code2 size={14} /> TypeScript & React 18
          </span>
          <span className="footer-item">
            <Database size={14} /> Supabase PostgreSQL
          </span>
          <span className="footer-item">
            <Cloud size={14} /> Deno Edge Functions
          </span>
          <span className="footer-item">
            <Palette size={14} /> Vite & Editorial CSS
          </span>
          <span className="footer-item">
            <Sparkles size={14} /> Gemini Vision AI
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 NutriScan. All rights reserved.</span>
        <span className="footer-tech-note">AI & Computer Vision Subject Project</span>
      </div>
    </footer>
  )
}

export default Footer
