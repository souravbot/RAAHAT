// DemoBar — Prominent banner for Hackathon Demo Mode showing live 10-step story progression,
// step navigation (Previous/Next/Jump), and one-click scenario execution via real backend engines.

import { useState, useEffect } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

const DEMO_STEPS = [
  { id: 1, label: 'DIGITAL TWIN', icon: 'hub', route: '/map' },
  { id: 2, label: 'DISRUPTION DETECTED', icon: 'warning', route: '/disruptions' },
  { id: 3, label: 'ACCESSIBILITY CHANGED', icon: 'route', route: '/map' },
  { id: 4, label: 'IMPACT ANALYSIS', icon: 'query_stats', route: '/impact-analysis' },
  { id: 5, label: 'SUPPLY RISK', icon: 'inventory_2', route: '/priority' },
  { id: 6, label: 'PRIORITY TARGET', icon: 'priority_high', route: '/priority' },
  { id: 7, label: 'WAREHOUSE SELECTED', icon: 'warehouse', route: '/action-plan' },
  { id: 8, label: 'VEHICLE SELECTED', icon: 'local_shipping', route: '/action-plan' },
  { id: 9, label: 'ROUTE CALCULATED', icon: 'alt_route', route: '/action-plan' },
  { id: 10, label: 'ACTION PLAN', icon: 'assignment', route: '/action-plan' },
]

export default function DemoBar() {
  const demoBusy = useTwinStore((s) => s.demoBusy)
  const demoResult = useTwinStore((s) => s.demoResult)
  const runDemoNow = useTwinStore((s) => s.runDemoNow)
  const resetDemoFlow = useTwinStore((s) => s.resetDemoFlow)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showStoryDetails, setShowStoryDetails] = useState(true)

  const isCompleted = demoResult && demoResult.success === true

  useEffect(() => {
    if (isCompleted) {
      setCurrentStepIndex(DEMO_STEPS.length - 1)
    } else {
      setCurrentStepIndex(0)
    }
  }, [isCompleted])

  const handleRun = async () => {
    try {
      await runDemoNow()
      setCurrentStepIndex(DEMO_STEPS.length - 1)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = async () => {
    try {
      await resetDemoFlow()
      setCurrentStepIndex(0)
    } catch (err) {
      console.error(err)
    }
  }

  const handleStepClick = (idx, step) => {
    setCurrentStepIndex(idx)
    if (step.route && window.location.pathname !== step.route) {
      window.history.pushState(null, '', step.route)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleNextStep = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1
      handleStepClick(nextIdx, DEMO_STEPS[nextIdx])
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1
      handleStepClick(prevIdx, DEMO_STEPS[prevIdx])
    }
  }

  const activeStep = DEMO_STEPS[currentStepIndex] || DEMO_STEPS[0]
  const storyItem = isCompleted && demoResult.story ? demoResult.story[Math.min(currentStepIndex, demoResult.story.length - 1)] : null

  return (
    <div className="demo-bar-container" id="demo-bar">
      <div className="demo-bar-top">
        <div className="demo-bar-badge">
          <span className="material-symbols-outlined demo-badge-icon">sports_score</span>
          <span className="demo-badge-title">🎯 SIH 2026 DEMO MODE</span>
          <span className="demo-badge-sub">Single-Click End-to-End Workflow Execution</span>
        </div>

        <div className="demo-bar-actions">
          <button
            className="btn-demo-action btn-demo-run"
            onClick={handleRun}
            disabled={demoBusy}
            id="btn-run-demo-scenario"
          >
            <span className="material-symbols-outlined">{demoBusy ? 'hourglass_top' : 'rocket_launch'}</span>
            {demoBusy ? 'Executing Scenario…' : '▶ RUN RAAHAT DEMO'}
          </button>

          <button
            className="btn-demo-action btn-demo-reset"
            onClick={handleReset}
            disabled={demoBusy}
            id="btn-reset-demo-scenario"
          >
            <span className="material-symbols-outlined">restart_alt</span>
            ↻ RESET DEMO
          </button>
        </div>
      </div>

      {/* 10-Step Workflow Progress Indicator */}
      <div className="demo-workflow-strip">
        {DEMO_STEPS.map((step, idx) => {
          const isComplete = isCompleted ? true : currentStepIndex > idx
          const isActive = isCompleted ? currentStepIndex === idx : (!demoBusy && currentStepIndex === idx)

          return (
            <div
              key={step.id}
              className={`demo-workflow-step ${isComplete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`}
              onClick={() => handleStepClick(idx, step)}
              title={`Step ${step.id}: ${step.label}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="step-num">{step.id}</div>
              <span className="material-symbols-outlined step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
              {idx < DEMO_STEPS.length - 1 && <span className="step-arrow">→</span>}
            </div>
          )
        })}
      </div>

      {/* Active Story Narrative Card (When Demo Scenario is Active) */}
      {isCompleted && showStoryDetails && (
        <div className="demo-story-guidance-card">
          <div className="dsg-left">
            <span className="dsg-step-badge">STAGE {activeStep.id} OF 10</span>
            <div className="dsg-title-row">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--amber-400)' }}>
                {activeStep.icon}
              </span>
              <strong>{storyItem?.title || activeStep.label}</strong>
            </div>
            <p className="dsg-summary">
              {storyItem?.summary || 'Operational state updated across all digital twin intelligence engines.'}
            </p>
          </div>

          <div className="dsg-controls">
            <button
              className="btn-dsg-nav"
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
            >
              ← Prev
            </button>
            <button
              className="btn-dsg-nav"
              onClick={handleNextStep}
              disabled={currentStepIndex === DEMO_STEPS.length - 1}
            >
              Next →
            </button>
            <button
              className="btn-dsg-jump"
              onClick={() => handleStepClick(currentStepIndex, activeStep)}
            >
              <span>View {activeStep.label.split(' ')[0]} Screen</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
