// LoginPage — Gradient Modern redesign for RAAHAT.
// Design system matches landing.html: DM Serif Display headings, DM Sans body,
// Emerald=action, Cyan=connectivity, Amber=risk, Scarlet=disruption, Indigo=base.

import { useState, useEffect, useRef } from 'react'
import RoleSelector from '../components/auth/RoleSelector'
import { ROLES } from '../auth/permissions'

export default function LoginPage({ onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState(ROLES.COMMAND_CENTER)
  const [email, setEmail] = useState('command@raahat.gov.in')
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const canvasRef = useRef(null)

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey)
    setEmail(roleKey === ROLES.FIELD_OFFICER ? 'field.officer@raahat.gov.in' : 'command@raahat.gov.in')
  }

  // Subtle animated network canvas — indigo/cyan palette matching landing page
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth
      canvas.height = canvas.parentElement.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const N = 32
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.6 + 0.8,
      hue: Math.random(), // 0=indigo, 0.5=cyan, 1=emerald
    }))

    const pulses = Array.from({ length: 4 }, () => ({
      edgeFrom: Math.floor(Math.random() * N),
      edgeTo: Math.floor(Math.random() * N),
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.003,
    }))

    const getNodeColor = (hue) => {
      if (hue < 0.4) return 'rgba(79,70,229,'
      if (hue < 0.7) return 'rgba(34,211,238,'
      return 'rgba(16,185,129,'
    }
    const getPulseColor = (hue) => {
      if (hue < 0.4) return 'rgba(99,88,249,'
      if (hue < 0.7) return 'rgba(34,211,238,'
      return 'rgba(16,185,129,'
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      // Edges
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 160) {
            ctx.strokeStyle = `rgba(100,116,139,${(1 - d / 160) * 0.09})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      // Nodes
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = getNodeColor(n.hue) + '0.28)'
        ctx.fill()
      })
      // Pulses
      pulses.forEach(p => {
        p.t += p.speed
        if (p.t >= 1) {
          p.t = 0
          p.edgeFrom = Math.floor(Math.random() * N)
          p.edgeTo = Math.floor(Math.random() * N)
        }
        const a = nodes[p.edgeFrom], b = nodes[p.edgeTo]
        if (!a || !b) return
        const px = a.x + (b.x - a.x) * p.t, py = a.y + (b.y - a.y) * p.t
        const col = getPulseColor(a.hue)
        const g = ctx.createRadialGradient(px, py, 0, px, py, 10)
        g.addColorStop(0, col + '0.55)')
        g.addColorStop(1, col + '0)')
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = col + '1)'; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
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
      setLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess(selectedRole, email)
      } else {
        localStorage.setItem('raahat_auth', 'true')
        localStorage.setItem('raahat_role', selectedRole)
        localStorage.setItem('raahat_email', email)
        window.location.pathname = '/dashboard'
      }
    }, 600)
  }

  const handleLaunchDemo = () => {
    if (onLoginSuccess) {
      onLoginSuccess(ROLES.DEMO, 'demo.judge@raahat.gov.in')
    } else {
      localStorage.setItem('raahat_auth', 'true')
      localStorage.setItem('raahat_role', ROLES.DEMO)
      localStorage.setItem('raahat_email', 'demo.judge@raahat.gov.in')
      window.location.pathname = '/dashboard'
    }
  }

  return (
    <div style={S.page}>
      {/* ── LEFT: Brand panel ── */}
      <div style={S.brandPanel}>
        <canvas ref={canvasRef} style={S.canvas} />
        <div style={S.brandContent}>
          {/* Back to landing */}
          <a href="/landing.html" style={S.backLink} title="Back to landing page">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
            raahat.gov.in
          </a>

          <div style={S.brandCenter}>
            <div style={S.logoMark}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#fff' }}>hub</span>
            </div>
            <h1 style={S.wordmark}>RAAHAT</h1>
            <p style={S.wordmarkSub}>Regional AI for Accessibility,<br />Assistance &amp; Transport Intelligence</p>
            <p style={S.brandTagline}>
              "The question is never just what is blocked —<br />
              it is what cascades from this moment."
            </p>
            <div style={S.threeQs}>
              <div style={{ ...S.qPill, ...S.qRed }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>crisis_alert</span>
                What happened?
              </div>
              <div style={{ ...S.qPill, ...S.qAmber }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>people</span>
                Who is affected?
              </div>
              <div style={{ ...S.qPill, ...S.qGreen }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>task_alt</span>
                What next?
              </div>
            </div>
          </div>

          <div style={S.brandFooter}>
            <div style={S.brandPills}>
              <span style={S.pill}>Digital Twin</span>
              <span style={S.pill}>Impact Analysis</span>
              <span style={S.pill}>Action Plans</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div style={S.formPanel}>
        <div style={S.formWrap}>
          {/* Header */}
          <div style={S.formHeader}>
            <div style={S.securityBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#10B981' }}>verified_user</span>
              <span>Secure Access</span>
            </div>
            <h2 style={S.formTitle}>Sign in</h2>
            <p style={S.formSubtitle}>
              Access the RAAHAT regional intelligence platform
            </p>
          </div>

          {/* Role selector */}
          <RoleSelector selectedRole={selectedRole} onSelectRole={handleRoleSelect} />

          <form onSubmit={handleSubmit} style={S.form}>
            {error && (
              <div style={S.errorBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {error}
              </div>
            )}

            {/* Email */}
            <div style={S.fieldGroup}>
              <label style={S.label} htmlFor="login-email">Official Email</label>
              <div style={{ ...S.inputWrap, ...(focusedField === 'email' ? S.inputWrapFocus : {}) }}>
                <span className="material-symbols-outlined" style={S.inputIcon}>mail</span>
                <input
                  id="login-email"
                  type="email"
                  style={S.input}
                  placeholder="you@raahat.gov.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={S.fieldGroup}>
              <div style={S.labelRow}>
                <label style={S.label} htmlFor="login-password">Password</label>
                <button
                  type="button"
                  style={S.forgotLink}
                  onClick={() => alert('Demo Mode: any non-empty password accepted.')}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ ...S.inputWrap, ...(focusedField === 'pass' ? S.inputWrapFocus : {}) }}>
                <span className="material-symbols-outlined" style={S.inputIcon}>lock</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...S.input, paddingRight: '2.75rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
                <button
                  type="button"
                  style={S.eyeBtn}
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              style={{ ...S.submitBtn, opacity: loading ? 0.75 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {loading ? 'progress_activity' : 'login'}
              </span>
              {loading ? 'Authenticating…' : selectedRole === ROLES.FIELD_OFFICER ? 'Sign In as Field Officer' : 'Sign In to Command Center'}
            </button>
          </form>

          {/* Demo Mode card */}
          <div style={S.demoCard}>
            <div style={S.demoCardLeft}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div>
                <div style={S.demoCardTitle}>Demo Mode</div>
                <div style={S.demoCardDesc}>Full disaster-response workflow — no login required</div>
              </div>
            </div>
            <button
              type="button"
              id="btn-launch-demo-mode"
              style={S.demoBtn}
              onClick={handleLaunchDemo}
            >
              Launch Demo →
            </button>
          </div>

          {/* Sign Up link */}
          <p style={S.switchLink}>
            Don&apos;t have an account?{' '}
            <a
              href="/signup"
              style={S.switchA}
              onClick={e => { e.preventDefault(); window.history.pushState(null, '', '/signup'); window.dispatchEvent(new PopStateEvent('popstate')) }}
            >
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  // ── Page shell: fills exact viewport height, no overflow ──
  page: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#05080F',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },

  // ── LEFT: Brand panel ──
  brandPanel: {
    position: 'relative',
    flex: '0 0 44%',
    maxWidth: 520,
    background: 'linear-gradient(160deg, #0C1120 0%, #111827 50%, #0C1120 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',        // canvas stays inside
    borderRight: '1px solid rgba(241,245,249,0.06)',
  },
  canvas: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 0,
  },
  // Scrollable inner wrapper so brand content never clips on small laptops
  brandContent: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column',
    height: '100%',
    padding: '2rem 2.5rem',
    overflowY: 'auto',
    // ① CENTER everything horizontally in the brand panel
    alignItems: 'center',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em',
    color: 'rgba(148,163,184,0.7)', textDecoration: 'none',
    transition: 'color 0.2s',
    alignSelf: 'flex-start',   // back link stays top-left, only it
    marginBottom: '0',
  },
  // ① Centered brand composition
  brandCenter: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',      // ← center horizontally
    justifyContent: 'center',
    padding: '1.5rem 0',
    width: '100%',
  },
  // ⑤ Slightly larger logo mark for better balance
  logoMark: {
    width: 64, height: 64,
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(16,185,129,0.28) 0%, rgba(20,184,166,0.22) 100%)',
    border: '1px solid rgba(16,185,129,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '1.25rem',
    boxShadow: '0 0 36px rgba(16,185,129,0.18)',
  },
  wordmark: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 'clamp(2.6rem, 4.5vw, 3.5rem)',
    fontWeight: 400,
    letterSpacing: '0.1em',
    lineHeight: 1,
    background: 'linear-gradient(90deg, #F1F5F9 0%, #22D3EE 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '0.6rem',
  },
  wordmarkSub: {
    fontSize: '0.8rem', fontWeight: 500,
    lineHeight: 1.65,
    color: 'rgba(148,163,184,0.8)',
    marginBottom: '1.5rem',
    letterSpacing: '0.01em',
  },
  // ⑤ Quote: narrower, centered, no left-border so it centers cleanly
  brandTagline: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '0.97rem',
    fontStyle: 'italic',
    lineHeight: 1.7,
    color: 'rgba(241,245,249,0.5)',
    borderTop: '1px solid rgba(34,211,238,0.18)',
    borderBottom: '1px solid rgba(34,211,238,0.18)',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    maxWidth: 320,
  },
  // ① Three-question pills: centered
  threeQs: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',      // ← center pills
    gap: '0.5rem',
  },
  qPill: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.35rem 0.9rem',
    fontSize: '0.75rem', fontWeight: 600,
    borderRadius: 999,
    border: '1px solid',
  },
  qRed:   { color: '#FF8A8A', borderColor: 'rgba(242,61,61,0.3)',   background: 'rgba(242,61,61,0.07)' },
  qAmber: { color: '#F4A93D', borderColor: 'rgba(244,169,61,0.3)', background: 'rgba(244,169,61,0.07)' },
  qGreen: { color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.07)' },
  // ⑤ Footer: centered pills
  brandFooter: {
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(241,245,249,0.06)',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  brandPills: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' },
  pill: {
    padding: '0.28rem 0.7rem',
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em',
    color: 'rgba(148,163,184,0.7)',
    background: 'rgba(241,245,249,0.04)',
    border: '1px solid rgba(241,245,249,0.08)',
    borderRadius: 6,
  },

  // ── RIGHT: Form panel ──
  // ⑥ Full height, scrollable, so nothing clips on small screens
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0 2rem',
    background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(16,185,129,0.04) 0%, transparent 65%), #05080F',
    overflowY: 'auto',
    height: '100%',
  },
  formWrap: {
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: '1.1rem',
    // vertically center as long as content fits, scroll when it doesn't
    margin: 'auto',
    paddingTop: '2.5rem',
    paddingBottom: '2.5rem',
  },
  // ② Center the form header (badge + title + subtitle)
  formHeader: {
    display: 'flex', flexDirection: 'column',
    gap: '0.4rem',
    alignItems: 'center',      // ← center badge/title/subtitle
    textAlign: 'center',
  },
  securityBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: '#10B981',
    padding: '0.28rem 0.7rem',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 4,
  },
  formTitle: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 'clamp(1.8rem, 3vw, 2.25rem)',
    fontWeight: 400, color: '#F1F5F9',
    letterSpacing: '-0.01em',
  },
  formSubtitle: {
    fontSize: '0.875rem', color: 'rgba(148,163,184,0.75)', lineHeight: 1.6,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.7rem 1rem',
    background: 'rgba(242,61,61,0.08)',
    border: '1px solid rgba(242,61,61,0.2)',
    borderRadius: 8,
    fontSize: '0.84rem', color: '#FF8080',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.78rem', fontWeight: 600, color: 'rgba(148,163,184,0.9)', letterSpacing: '0.03em' },
  labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
    background: 'rgba(17,24,39,0.8)',
    border: '1px solid rgba(241,245,249,0.1)',
    borderRadius: 10,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputWrapFocus: {
    borderColor: 'rgba(34,211,238,0.4)',
    boxShadow: '0 0 0 3px rgba(34,211,238,0.08)',
  },
  inputIcon: {
    position: 'absolute', left: '0.9rem',
    fontSize: '18px', color: 'rgba(100,116,139,0.8)',
    userSelect: 'none', pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '0.75rem 0.9rem 0.75rem 2.65rem',
    fontSize: '0.9rem', color: '#F1F5F9',
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  eyeBtn: {
    position: 'absolute', right: '0.75rem',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(100,116,139,0.8)', padding: '0.25rem',
    display: 'flex', alignItems: 'center',
    transition: 'color 0.2s',
  },
  forgotLink: {
    fontSize: '0.75rem', fontWeight: 600,
    color: 'rgba(34,211,238,0.7)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    width: '100%', padding: '0.82rem 1.5rem',
    fontSize: '0.92rem', fontWeight: 700,
    color: '#05080F',
    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 60%, #22D3EE 100%)',
    border: 'none', borderRadius: 10, cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.3)',
    transition: 'all 0.25s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  demoCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
    padding: '0.85rem 1.1rem',
    background: 'rgba(17,24,39,0.6)',
    border: '1px solid rgba(241,245,249,0.08)',
    borderRadius: 12,
  },
  demoCardLeft: { display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 },
  demoCardTitle: { fontSize: '0.82rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.1rem' },
  demoCardDesc: { fontSize: '0.7rem', color: 'rgba(148,163,184,0.7)', lineHeight: 1.4 },
  demoBtn: {
    padding: '0.45rem 0.9rem',
    fontSize: '0.76rem', fontWeight: 700,
    color: '#F4A93D',
    background: 'rgba(244,169,61,0.1)',
    border: '1px solid rgba(244,169,61,0.25)',
    borderRadius: 8, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.2s',
  },
  switchLink: {
    textAlign: 'center', fontSize: '0.84rem', color: 'rgba(148,163,184,0.7)',
    paddingBottom: '0.5rem',
  },
  switchA: {
    color: '#22D3EE', fontWeight: 600, textDecoration: 'none',
  },
}
