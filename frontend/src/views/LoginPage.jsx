// LoginPage — Split-screen login view for RAAHAT.
// Left: Login form with mock authentication.
// Right: Navy panel with brand wordmark and animated network background.

import { useState, useEffect, useRef } from 'react'

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('command@raahat.gov.in')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef(null)

  // Animated network graph background on the right navy panel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationId

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth
      canvas.height = canvas.parentElement.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Nodes setup
    const nodeCount = 28
    const nodes = []
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 2,
      })
    }

    // Pulses traveling along connected lines
    const pulses = [
      { from: 0, to: 5, progress: 0.1, speed: 0.005 },
      { from: 3, to: 12, progress: 0.5, speed: 0.004 },
      { from: 8, to: 18, progress: 0.8, speed: 0.006 },
    ]

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Move nodes
      nodes.forEach((n) => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.25
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(232, 135, 30, ${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.fill()
      })

      // Draw pulses
      pulses.forEach((p) => {
        p.progress += p.speed
        if (p.progress >= 1) {
          p.progress = 0
          p.from = Math.floor(Math.random() * nodes.length)
          p.to = Math.floor(Math.random() * nodes.length)
        }
        const n1 = nodes[p.from]
        const n2 = nodes[p.to]
        if (n1 && n2) {
          const px = n1.x + (n2.x - n1.x) * p.progress
          const py = n1.y + (n2.y - n1.y) * p.progress
          ctx.beginPath()
          ctx.arc(px, py, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = '#E8871E'
          ctx.shadowBlur = 8
          ctx.shadowColor = '#E8871E'
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('raahat_auth', 'true')
      setLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess()
      } else {
        window.location.pathname = '/dashboard'
      }
    }, 400)
  }

  return (
    <div className="login-container" id="login-container">
      {/* Left panel: Login Form */}
      <div className="login-left">
        <div className="login-form-wrap">
          <div className="login-header">
            <div className="login-badge">
              <span className="material-symbols-outlined">shield_person</span>
              Command Portal
            </div>
            <h1 className="login-title">Sign in to RAAHAT</h1>
            <p className="login-subtitle">
              Regional Logistics & Accessibility Intelligence System
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">Official Email</label>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">mail</span>
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="operator@raahat.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field-header">
                <label htmlFor="login-password">Password</label>
                <a
                  href="#forgot"
                  className="login-forgot-link"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Demo Mode: Enter any non-empty password to sign in.')
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">lock</span>
                <input
                  id="login-password"
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              id="btn-login-submit"
            >
              <span className="material-symbols-outlined">
                {loading ? 'progress_activity' : 'login'}
              </span>
              {loading ? 'Authenticating…' : 'Sign In to Command Center'}
            </button>

            <div className="login-demo-notice">
              <span className="material-symbols-outlined">info</span>
              <span>
                <strong>Hackathon Demo:</strong> Enter any credentials to access mission control.
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Right panel: Navy Brand & Animation */}
      <div className="login-right">
        <canvas ref={canvasRef} className="login-canvas" />
        <div className="login-brand-content">
          <div className="login-wordmark-group">
            <h2 className="login-wordmark">RAAHAT</h2>
            <div className="login-wordmark-tag">COMMAND CENTER</div>
          </div>
          <p className="login-brand-tagline">
            Predicts disruption. Understands impact. Keeps essential resources moving.
          </p>
          <div className="login-brand-pills">
            <span className="login-pill">Digital Twin</span>
            <span className="login-pill">Accessibility Intelligence</span>
            <span className="login-pill">Resource Optimization</span>
          </div>
        </div>
      </div>
    </div>
  )
}
