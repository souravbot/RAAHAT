// OperationalIntelligenceWorkflow — Orchestrates the seven-stage guided operational
// journey: Disruption → Accessibility → Impact → Supply → Priority → Action → Route.
// Each stage builds on previous results; workflow resets on new incidents while
// preserving the digital twin state. No new components needed—wraps existing
// intelligence engine panels with workflow context and stage progression logic.

import { useMemo } from 'react'
import { useTwinStore } from '../../state/useTwinStore'
import DisruptionControl from '../disruption/DisruptionControl'
import AccessibilityDashboard from '../disruption/AccessibilityDashboard'
import ImpactAnalysisPanel from '../disruption/ImpactAnalysisPanel'
import CriticalSupplyPanel from '../disruption/CriticalSupplyPanel'
import PriorityPanel from '../disruption/PriorityPanel'
import ActionPlanPanel from '../disruption/ActionPlanPanel'

const STAGES = [
  { id: 'disruption', label: 'Disruption Event', order: 1 },
  { id: 'accessibility', label: 'Accessibility Check', order: 2 },
  { id: 'impact', label: 'Impact Analysis', order: 3 },
  { id: 'supply', label: 'Supply Risk', order: 4 },
  { id: 'priority', label: 'Priority Selection', order: 5 },
  { id: 'action', label: 'Action Plan', order: 6 },
  { id: 'route', label: 'Route & Dispatch', order: 7 },
]

// Maps workflow stage to required store state for validation
const STAGE_REQUIREMENTS = {
  disruption: { required: [], hint: 'Apply a disruption event to begin' },
  accessibility: { required: ['activeDisruption'], hint: 'Disruption event must be active' },
  impact: { required: ['activeDisruption', 'selectedEdgeId'], hint: 'Disruption and edge selection required' },
  supply: { required: ['activeDisruption'], hint: 'Disruption event must be active' },
  priority: { required: ['activeDisruption', 'supplyData'], hint: 'Supply risk analysis must be completed first' },
  action: { required: ['selectedPriorityTarget', 'priorities'], hint: 'Priority selection required' },
  route: { required: ['actionPlan'], hint: 'Action plan must be generated first' },
}

export default function OperationalIntelligenceWorkflow() {
  const activeDisruption = useTwinStore((s) => s.activeDisruption)
  const workflowStage = useTwinStore((s) => s.workflowStage)
  const workflowHistory = useTwinStore((s) => s.workflowHistory)
  const impactResult = useTwinStore((s) => s.impactResult)
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectedPriorityTarget = useTwinStore((s) => s.selectedPriorityTarget)
  const supplyData = useTwinStore((s) => s.supplyData)
  const priorities = useTwinStore((s) => s.priorities)
  const getWorkflowProgress = useTwinStore((s) => s.getWorkflowProgress)
  const advanceToStage = useTwinStore((s) => s.advanceToStage)
  const villageAccessibility = useTwinStore((s) => s.villageAccessibility)

  // Compute completion status for each stage
  const stageStatus = useMemo(() => {
    const status = {}
    STAGES.forEach((stage) => {
      status[stage.id] = {
        completed: workflowHistory.includes(stage.id),
        current: workflowStage === stage.id,
        order: stage.order,
      }
    })
    return status
  }, [workflowHistory, workflowStage])

  // Validate if stage can be advanced to
  const canAdvanceTo = (stage) => {
    const reqs = STAGE_REQUIREMENTS[stage]
    if (!reqs) return false
    return reqs.required.every((field) => {
      const val = {
        activeDisruption,
        selectedEdgeId,
        impactResult,
        actionPlan,
        selectedPriorityTarget,
        supplyData,
        priorities,
      }[field]
      return val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true)
    })
  }

  const handleStageClick = (stageId) => {
    if (canAdvanceTo(stageId)) {
      advanceToStage(stageId)
    }
  }

  const progress = getWorkflowProgress()

  return (
    <div className="operational-workflow-container">
      {/* Progress Header */}
      <div className="workflow-progress-header">
        <h2 className="workflow-title">
          🎯 Operational Intelligence Workflow
        </h2>
        <div className="workflow-progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
          <span className="progress-text">
            {progress.completed}/{progress.total} stages completed
          </span>
        </div>

        {/* Stage Indicators */}
        <div className="stage-indicators">
          {STAGES.map((stage) => {
            const s = stageStatus[stage.id]
            const canAdvance = canAdvanceTo(stage.id)
            return (
              <div
                key={stage.id}
                className={`stage-indicator ${s.current ? 'current' : ''} ${s.completed ? 'completed' : ''} ${canAdvance && !s.current ? 'clickable' : 'disabled'}`}
                onClick={() => handleStageClick(stage.id)}
                title={!canAdvance ? STAGE_REQUIREMENTS[stage.id]?.hint : stage.label}
              >
                <div className="stage-circle">{stage.order}</div>
                <div className="stage-name">{stage.label}</div>
                {s.completed && <div className="stage-checkmark">✓</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage Content */}
      <div className="workflow-content">
        {!activeDisruption && workflowStage !== 'disruption' && (
          <div className="stage-placeholder">
            <p>No active disruption. Apply an event to begin the workflow.</p>
          </div>
        )}

        {workflowStage === 'disruption' && (
          <div className="stage-panel">
            <h3>Apply Disruption Event</h3>
            <DisruptionControl />
          </div>
        )}

        {workflowStage === 'accessibility' && activeDisruption && (
          <div className="stage-panel">
            <h3>Accessibility Check</h3>
            <p className="stage-hint">
              Checking how the disruption affects accessibility to critical services
              in the affected region.
            </p>
            {villageAccessibility && Object.keys(villageAccessibility).length > 0 ? (
              <AccessibilityDashboard />
            ) : (
              <div className="loading-hint">Calculating accessibility metrics...</div>
            )}
          </div>
        )}

        {workflowStage === 'impact' && activeDisruption && (
          <div className="stage-panel">
            <h3>Impact Analysis</h3>
            <p className="stage-hint">
              Analyze cascading impact of the disruption on connected infrastructure
              and services.
            </p>
            <ImpactAnalysisPanel
              onImpactAnalyzed={() => {
                // Could auto-advance here, but user control is better
              }}
            />
          </div>
        )}

        {workflowStage === 'supply' && activeDisruption && (
          <div className="stage-panel">
            <h3>Supply Risk Assessment</h3>
            <p className="stage-hint">
              Identify critical supply shortages and facility depletion risks
              from the disruption context.
            </p>
            <CriticalSupplyPanel />
          </div>
        )}

        {workflowStage === 'priority' && activeDisruption && (
          <div className="stage-panel">
            <h3>Priority Selection</h3>
            <p className="stage-hint">
              Select priority target facility and resource type for intervention.
            </p>
            <PriorityPanel />
          </div>
        )}

        {workflowStage === 'action' && activeDisruption && (
          <div className="stage-panel">
            <h3>Action Plan Generation</h3>
            <p className="stage-hint">
              Generate vehicle assignment and delivery route based on selected
              priority and supply needs.
            </p>
            <ActionPlanPanel
              onActionConfirmed={() => {
                // Action confirmed; route overlay will render automatically
              }}
            />
          </div>
        )}

        {workflowStage === 'route' && activeDisruption && (
          <div className="stage-panel">
            <h3>Route & Dispatch</h3>
            <p className="stage-hint">
              Delivery route is active. Vehicle is dispatched. Monitor progress
              on the map.
            </p>
            {actionPlan?.success ? (
              <div className="route-info">
                <p>✓ Action confirmed. Route overlay is active on map.</p>
                <p className="vehicle-status">
                  Vehicle: {actionPlan.selected_vehicle?.id} from{' '}
                  {actionPlan.selected_warehouse?.name}
                </p>
                <p className="target-status">
                  Target: {actionPlan.request?.target_node}
                </p>
              </div>
            ) : (
              <div className="loading-hint">No active action plan.</div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .operational-workflow-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }

        .workflow-progress-header {
          padding: 20px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }

        .workflow-title {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .workflow-progress-bar {
          position: relative;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #0ea5e9);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-text {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .stage-indicators {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 0;
          scroll-behavior: smooth;
        }

        .stage-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          background: #f1f5f9;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: default;
          transition: all 0.2s ease;
          white-space: nowrap;
          position: relative;
          flex-shrink: 0;
        }

        .stage-indicator.current {
          background: #0284c7;
          color: white;
          border-color: #0284c7;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .stage-indicator.completed {
          background: #dcfce7;
          border-color: #16a34a;
          color: #16a34a;
        }

        .stage-indicator.clickable {
          cursor: pointer;
          background: #e0f2fe;
          border-color: #0284c7;
        }

        .stage-indicator.clickable:hover {
          background: #0284c7;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .stage-indicator.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stage-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.2);
        }

        .stage-indicator.current .stage-circle {
          background: rgba(255, 255, 255, 0.3);
        }

        .stage-name {
          font-size: 12px;
          font-weight: 500;
        }

        .stage-checkmark {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          background: #16a34a;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        .workflow-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .stage-panel {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .stage-panel h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .stage-hint {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        .stage-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background: white;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 14px;
          text-align: center;
        }

        .loading-hint {
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          color: #0284c7;
          font-size: 13px;
          font-weight: 500;
        }

        .route-info {
          padding: 16px;
          background: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 6px;
          color: #16a34a;
          font-size: 13px;
        }

        .route-info p {
          margin: 8px 0;
        }

        .vehicle-status {
          font-weight: 600;
        }

        .target-status {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
