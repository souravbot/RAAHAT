// SignUpPage — Gradient Modern design for RAAHAT.
// Welcoming but professional onboarding into the regional intelligence platform.
// Visually related to LoginPage but warmer and more forward-looking.

import { useState, useEffect, useRef } from 'react'
import { ROLES } from '../auth/permissions'

export default function SignUpPage({ onLoginSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', org: '', role: 'Command Center Officer',
    password: '', confirm: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=identity, 2=access
  const canvasRef = useRef(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  // Animated canvas — slightly warmer than login: indigo → violet → emerald
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

    const N = 28
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.20, vy: (Math.random() - 0.5) * 0.20,
      r: Math.random() * 1.8 + 0.8,
      hue: Math.random(), // 0=violet, 0.5=teal, 1=emerald
    }))

    const pulses = Array.from({ length: 3 }, () => ({
      a: Math.floor(Math.random() * N), b: Math.floor(Math.random() * N),
      t: Math.random(), speed: 0.003 + Math.random() * 0.003,
    }))

    const nColor = h => h < 0.4 ? 'rgba(124,58,237,' : h < 0.7 ? 'rgba(20,184,166,' : 'rgba(16,185,129,'
    const pColor = h => h < 0.4 ? 'rgba(139,92,246,' : h < 0.7 ? 'rgba(20,184,166,' : 'rgba(52,211,153,'

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 155) {
          ctx.strokeStyle = `rgba(100,116,139,${(1 - d / 155) * 0.08})`
          ctx.lineWidth = 0.8; ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke()
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = nColor(n.hue) + '0.25)'; ctx.fill()
      })
      pulses.forEach(p => {
        p.t += p.speed; if (p.t >= 1) { p.t = 0; p.a = Math.floor(Math.random() * N); p.b = Math.floor(Math.random() * N) }
        const a = nodes[p.a], b = nodes[p.b]; if (!a || !b) return
        const px = a.x + (b.x - a.x) * p.t, py = a.y + (b.y - a.y) * p.t
        const col = pColor(a.hue)
        const g = ctx.createRadialGradient(px, py, 0, px, py, 10)
        g.addColorStop(0, col + '0.5)'); g.addColorStop(1, col + '0)')
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fillStyle = col + '1)'; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  const validate = () => {
    if (step === 1) {
      if (!form.name.trim()) return 'Full name is required.'
      if (!form.email.trim() || !form.email.includes('@')) return 'A valid email is required.'
      return null
    }
    if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) return 'Passwords do not match.'
    return null
  }

  const handleNext = (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setStep(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess(ROLES.COMMAND_CENTER, form.email)
      } else {
        localStorage.setItem('raahat_auth', 'true')
        localStorage.setItem('raahat_role', ROLES.COMMAND_CENTER)
        localStorage.setItem('raahat_email', form.email)
        window.location.pathname = '/dashboard'
      }
    }, 700)
  }

  const goToLogin = (e) => {
    e.preventDefault()
    window.history.pushState(null, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const iF = (key) => ({ ...S.inputWrap, ...(focusedField === key ? S.inputWrapFocus : {}) })

  return (
    <div style={S.page}>
      {/* ── LEFT: Brand panel (slightly warmer tone than Login) ── */}
      <div style={S.brandPanel}>
        <canvas ref={canvasRef} style={S.canvas} />
        <div style={S.brandContent}>
          <a href="/landing.html" style={S.backLink}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
            raahat.gov.in
          </a>

          <div style={S.brandCenter}>
            <div style={S.logoMark}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#fff' }}>explore</span>
            </div>
            <h1 style={S.wordmark}>RAAHAT</h1>
            <p style={S.wordmarkSub}>Regional AI for Accessibility,<br />Assistance &amp; Transport Intelligence</p>

            <div style={S.onboardInfo}>
              <p style={S.onboardHeading}>You are joining a platform built for moments that matter.</p>
              <p style={S.onboardBody}>
                RAAHAT helps regional authorities understand infrastructure disruptions,
                trace their cascading consequences, prioritise urgent needs and generate
                clear, explainable response plans.
              </p>
            </div>

            {/* Progress steps */}
            <div style={S.stepIndicator}>
              <div style={S.stepItem}>
                <div style={{ ...S.stepDot, background: '#10B981', boxShadow: step >= 1 ? '0 0 10px rgba(16,185,129,0.5)' : 'none' }}>
                  {step > 1 ? <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#fff' }}>check</span> : <span style={S.stepDotNum}>1</span>}
                </div>
                <span style={{ ...S.stepLabel, color: step >= 1 ? '#F1F5F9' : 'rgba(148,163,184,0.5)' }}>Identity</span>
              </div>
              <div style={S.stepConnector(step >= 2)} />
              <div style={S.stepItem}>
                <div style={{ ...S.stepDot, background: step >= 2 ? '#10B981' : 'rgba(241,245,249,0.1)', boxShadow: step >= 2 ? '0 0 10px rgba(16,185,129,0.5)' : 'none' }}>
                  <span style={S.stepDotNum}>2</span>
                </div>
                <span style={{ ...S.stepLabel, color: step >= 2 ? '#F1F5F9' : 'rgba(148,163,184,0.5)' }}>Access</span>
              </div>
            </div>
          </div>

          <div style={S.brandFooter}>
            <div style={S.trustRow}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(16,185,129,0.7)' }}>verified_user</span>
              <span style={S.trustText}>Secure · Mission-critical · Trusted by responders</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Sign-up form ── */}
      <div style={S.formPanel}>
        <div style={S.formWrap}>
          <div style={S.formHeader}>
            <div style={S.stepBadge}>
              Step {step} of 2 — {step === 1 ? 'Your Identity' : 'Secure Access'}
            </div>
            <h2 style={S.formTitle}>
              {step === 1 ? 'Create your account' : 'Set your password'}
            </h2>
            <p style={S.formSubtitle}>
              {step === 1
                ? 'Tell us who you are and which organisation you represent.'
                : 'Choose a strong password to protect your RAAHAT access.'}
            </p>
          </div>

          {error && (
            <div style={S.errorBox}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <form onSubmit={handleNext} style={S.form}>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-name">Full Name</label>
                <div style={iF('name')}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>person</span>
                  <input id="su-name" type="text" style={S.input} placeholder="District Collector / Field Commander"
                    value={form.name} onChange={set('name')} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} required />
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-email">Official Email</label>
                <div style={iF('email')}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>mail</span>
                  <input id="su-email" type="email" style={S.input} placeholder="you@raahat.gov.in"
                    value={form.email} onChange={set('email')} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} required />
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-org">Organisation / District</label>
                <div style={iF('org')}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>apartment</span>
                  <input id="su-org" type="text" style={S.input} placeholder="e.g. Assam State Disaster Authority"
                    value={form.org} onChange={set('org')} onFocus={() => setFocusedField('org')} onBlur={() => setFocusedField(null)} />
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-role">Primary Role</label>
                <div style={{ ...iF('role'), ...S.selectWrap }}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>badge</span>
                  <select id="su-role" style={{ ...S.input, ...S.select }}
                    value={form.role} onChange={set('role')}
                    onFocus={() => setFocusedField('role')} onBlur={() => setFocusedField(null)}>
                    <option>Command Center Officer</option>
                    <option>District Collector</option>
                    <option>Field Officer</option>
                    <option>Logistics Coordinator</option>
                    <option>Emergency Responder</option>
                    <option>Researcher / Observer</option>
                  </select>
                </div>
              </div>
              <button type="submit" style={S.submitBtn}>
                <span>Continue to Access Setup</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={S.form}>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-pass">Password</label>
                <div style={iF('pass')}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>lock</span>
                  <input id="su-pass" type={showPass ? 'text' : 'password'} style={{ ...S.input, paddingRight: '2.75rem' }}
                    placeholder="Minimum 8 characters" value={form.password} onChange={set('password')}
                    onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} required minLength={8} />
                  <button type="button" style={S.eyeBtn} onClick={() => setShowPass(v => !v)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label} htmlFor="su-confirm">Confirm Password</label>
                <div style={iF('confirm')}>
                  <span className="material-symbols-outlined" style={S.inputIcon}>lock_reset</span>
                  <input id="su-confirm" type={showConfirm ? 'text' : 'password'} style={{ ...S.input, paddingRight: '2.75rem' }}
                    placeholder="Re-enter password" value={form.confirm} onChange={set('confirm')}
                    onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)} required />
                  <button type="button" style={S.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Password strength hint */}
              <div style={S.hintRow}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(34,211,238,0.6)' }}>info</span>
                <span style={S.hintText}>Use a strong password — you are protecting access to critical regional intelligence.</span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" style={S.backBtn} onClick={() => { setStep(1); setError(null) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                  Back
                </button>
                <button type="submit" id="btn-create-account" disabled={loading}
                  style={{ ...S.submitBtn, flex: 1, opacity: loading ? 0.75 : 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{loading ? 'progress_activity' : 'person_add'}</span>
                  {loading ? 'Creating Account…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p style={S.switchLink}>
            Already have an account?{' '}
            <a href="/login" style={S.switchA} onClick={goToLogin}>Sign in</a>
          </p>

          {/* Reassurance row */}
          <div style={S.reassuranceRow}>
            {['Encrypted access', 'Mission-critical reliability', 'Government-grade security'].map(t => (
              <div key={t} style={S.reassuranceItem}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(16,185,129,0.6)' }}>check_circle</span>
                <span style={S.reassuranceText}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    display: 'flex', minHeight: '100vh', background: '#05080F',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  brandPanel: {
    position: 'relative', flex: '0 0 45%', maxWidth: 540,
    background: 'linear-gradient(160deg, #0C1120 0%, #111827 55%, #0F1D3A 100%)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    borderRight: '1px solid rgba(241,245,249,0.06)',
  },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 },
  brandContent: { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '2.5rem' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em',
    color: 'rgba(148,163,184,0.7)', textDecoration: 'none',
  },
  brandCenter: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem 0' },
  logoMark: {
    width: 56, height: 56, borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(16,185,129,0.2) 100%)',
    border: '1px solid rgba(124,58,237,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(124,58,237,0.15)',
  },
  wordmark: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 400,
    letterSpacing: '0.1em', lineHeight: 1,
    background: 'linear-gradient(90deg, #F1F5F9 0%, #8B5CF6 50%, #14B8A6 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    marginBottom: '0.75rem',
  },
  wordmarkSub: {
    fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.6,
    color: 'rgba(148,163,184,0.8)', marginBottom: '2rem',
  },
  onboardInfo: { marginBottom: '2rem' },
  onboardHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.5,
    color: 'rgba(241,245,249,0.85)', marginBottom: '0.85rem',
  },
  onboardBody: {
    fontSize: '0.82rem', lineHeight: 1.75, color: 'rgba(148,163,184,0.7)',
  },
  stepIndicator: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  stepItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  stepDot: {
    width: 26, height: 26, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(16,185,129,0.4)',
    transition: 'all 0.3s',
  },
  stepDotNum: { fontSize: '0.68rem', fontWeight: 700, color: '#fff' },
  stepLabel: { fontSize: '0.78rem', fontWeight: 600, transition: 'color 0.3s' },
  stepConnector: (active) => ({
    flex: 1, height: 2, borderRadius: 1,
    background: active ? 'rgba(16,185,129,0.5)' : 'rgba(241,245,249,0.08)',
    transition: 'background 0.4s',
    minWidth: 24,
  }),
  brandFooter: { paddingTop: '1.5rem', borderTop: '1px solid rgba(241,245,249,0.06)' },
  trustRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  trustText: { fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)', letterSpacing: '0.02em' },

  // Form panel (right) — slightly cooler, more spacious
  formPanel: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3rem 2rem', overflowY: 'auto',
    background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(124,58,237,0.04) 0%, transparent 65%), #05080F',
  },
  formWrap: {
    width: '100%', maxWidth: 430,
    display: 'flex', flexDirection: 'column', gap: '1.25rem',
  },
  formHeader: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  stepBadge: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: '#8B5CF6',
    padding: '0.28rem 0.7rem',
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: 4, width: 'fit-content',
  },
  formTitle: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 400,
    color: '#F1F5F9', letterSpacing: '-0.01em',
  },
  formSubtitle: { fontSize: '0.875rem', color: 'rgba(148,163,184,0.8)', lineHeight: 1.6 },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(242,61,61,0.08)', border: '1px solid rgba(242,61,61,0.2)',
    borderRadius: 8, fontSize: '0.84rem', color: '#FF8080',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.45rem' },
  label: { fontSize: '0.78rem', fontWeight: 600, color: 'rgba(148,163,184,0.9)', letterSpacing: '0.03em' },
  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(241,245,249,0.1)',
    borderRadius: 10, transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputWrapFocus: {
    borderColor: 'rgba(139,92,246,0.45)',
    boxShadow: '0 0 0 3px rgba(124,58,237,0.09)',
  },
  selectWrap: {},
  inputIcon: {
    position: 'absolute', left: '0.9rem', fontSize: '18px',
    color: 'rgba(100,116,139,0.8)', userSelect: 'none', pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '0.78rem 0.9rem 0.78rem 2.65rem',
    fontSize: '0.9rem', color: '#F1F5F9',
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  select: {
    appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
    paddingRight: '0.9rem',
  },
  eyeBtn: {
    position: 'absolute', right: '0.75rem',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(100,116,139,0.8)', padding: '0.25rem',
    display: 'flex', alignItems: 'center', transition: 'color 0.2s',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    width: '100%', padding: '0.85rem 1.5rem',
    fontSize: '0.92rem', fontWeight: 700, color: '#05080F',
    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 60%, #22D3EE 100%)',
    border: 'none', borderRadius: 10, cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(16,185,129,0.28), 0 0 0 1px rgba(16,185,129,0.3)',
    transition: 'all 0.25s', fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  backBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
    padding: '0.85rem 1.1rem',
    fontSize: '0.88rem', fontWeight: 600, color: 'rgba(148,163,184,0.8)',
    background: 'rgba(241,245,249,0.04)', border: '1px solid rgba(241,245,249,0.1)',
    borderRadius: 10, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.2s', whiteSpace: 'nowrap',
  },
  hintRow: {
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
    padding: '0.65rem 0.9rem',
    background: 'rgba(34,211,238,0.04)',
    border: '1px solid rgba(34,211,238,0.1)',
    borderRadius: 8,
  },
  hintText: { fontSize: '0.75rem', color: 'rgba(148,163,184,0.65)', lineHeight: 1.55 },
  switchLink: { textAlign: 'center', fontSize: '0.84rem', color: 'rgba(148,163,184,0.7)' },
  switchA: { color: '#22D3EE', fontWeight: 600, textDecoration: 'none' },
  reassuranceRow: {
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
    padding: '0.9rem 1rem',
    background: 'rgba(17,24,39,0.5)',
    border: '1px solid rgba(241,245,249,0.06)',
    borderRadius: 10,
  },
  reassuranceItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  reassuranceText: { fontSize: '0.74rem', color: 'rgba(148,163,184,0.55)' },
}
