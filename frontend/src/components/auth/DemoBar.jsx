// DemoBar — Prominent banner for Hackathon Demo Mode showing live 10-step story progression and one-click scenario controls.

import { useTwinStore } from '../../state/useTwinStore'

const DEMO_STEPS = [
  { id: 1, label: 'DIGITAL TWIN', icon: 'hub' },
  { id: 2, label: 'DISRUPTION DETECTED', icon: 'warning' },
  { id: 3, label: 'ACCESSIBILITY CHANGED', icon: 'route' },
  { id: 4, label: 'IMPACT ANALYSIS', icon: 'query_stats' },
  { id: 5, label: 'SUPPLY RISK', icon: 'inventory_2' },
  { id: 6, label: 'PRIORITY TARGET', icon: 'priority_high' },
  { id: 7, label: 'WAREHOUSE SELECTED', icon: 'warehouse' },
  { id: 8, label: 'VEHICLE SELECTED', icon: 'local_shipping' },
  { id: 9, label: 'ROUTE CALCULATED', icon: 'alt_route' },
  { id: 10, label: 'ACTION PLAN', icon: 'assignment' },
]

export default function DemoBar() {
  const demoBusy = useTwinStore((s) => s.demoBusy)
  const demoResult = useTwinStore((s) => s.demoResult)
  const runDemoNow = useTwinStore((s) => s.runDemoNow)
  const resetDemoFlow = useTwinStore((s) => s.resetDemoFlow)

  const activeStepId = demoResult ? 10 : 1

  const handleRun = async () => {
    try {
      await runDemoNow()
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = async () => {
    try {
      await resetDemoFlow()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="demo-bar-container" id="demo-bar">
      <div className="demo-bar-top">
        <div className="demo-bar-badge">
          <span className="material-symbols-outlined demo-badge-icon">sports_score</span>
          <span className="demo-badge-title">🎯 HACKATHON DEMO MODE</span>
          <span className="demo-badge-sub">Full Interactive Workflow Execution</span>
        </div>

        <div className="demo-bar-actions">
          <button
            className="btn-demo-action btn-demo-run"
            onClick={handleRun}
            disabled={demoBusy}
            id="btn-run-demo-scenario"
          >
            <span className="material-symbols-outlined">{demoBusy ? 'hourglass_top' : 'rocket_launch'}</span>
            {demoBusy ? 'Executing Scenario…' : 'Run Demo Scenario'}
          </button>

          <button
            className="btn-demo-action btn-demo-reset"
            onClick={handleReset}
            disabled={demoBusy}
            id="btn-reset-demo-scenario"
          >
            <span className="material-symbols-outlined">restart_alt</span>
            Reset Demo
          </button>
        </div>
      </div>

      {/* 10-Step Workflow Progress Indicator */}
      <div className="demo-workflow-strip">
        {DEMO_STEPS.map((step, idx) => {
          const isComplete = demoResult || activeStepId > step.id
          const isActive = !demoResult && activeStepId === step.id
          return (
            <div
              key={step.id}
              className={`demo-workflow-step ${isComplete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`}
            >
              <div className="step-num">{step.id}</div>
              <span className="material-symbols-outlined step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
              {idx < DEMO_STEPS.length - 1 && <span className="step-arrow">→</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
