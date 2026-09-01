// SituationSummary — Compact operational situation bar below the topbar.
// Communicates current system state using real backend data only.
// Shows: operational status, active disruption, highest priority, recommended action readiness.

import { useTwinStore } from '../state/useTwinStore'

export default function SituationSummary() {
  const activeDisruption = useTwinStore((s) => s.activeDisruption)
  const priorities = useTwinStore((s) => s.priorities)
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const edges = useTwinStore((s) => s.edges)
  const loading = useTwinStore((s) => s.loading)

  const closedEdges = edges.filter((e) => e.status === 'CLOSED')
  const atRiskEdges = edges.filter((e) => e.status === 'AT_RISK')
  const hasDisruption = closedEdges.length > 0 || !!activeDisruption
  const topPriority = priorities && priorities.length > 0 ? priorities[0] : null
  const actionReady = actionPlan && actionPlan.success === true

  if (loading) {
    return (
      <div className="situation-bar situation-bar--loading">
        <span className="material-symbols-outlined sit-spin">hourglass_top</span>
        <span className="sit-label">Loading regional digital twin…</span>
      </div>
    )
  }

  return (
    <div className={`situation-bar ${hasDisruption ? 'situation-bar--alert' : 'situation-bar--normal'}`} id="situation-bar">
      {/* Operational Status */}
      <div className="sit-block">
        <span className={`sit-status-dot ${hasDisruption ? 'dot-alert' : 'dot-normal'}`} />
        <div className="sit-status-text">
          <span className="sit-label-upper">{hasDisruption ? 'ACTIVE DISRUPTION' : 'SYSTEM MONITORING'}</span>
          <span className="sit-detail">
            {hasDisruption
              ? closedEdges.length > 0
                ? `${closedEdges.length} route${closedEdges.length > 1 ? 's' : ''} closed`
                : 'Disruption active'
              : 'All connected infrastructure operational'}
          </span>
        </div>
      </div>

      <div className="sit-divider" />

      {/* Infrastructure Status */}
      <div className="sit-block">
        <span className="material-symbols-outlined sit-icon">alt_route</span>
        <div className="sit-status-text">
          <span className="sit-label-upper">INFRASTRUCTURE</span>
          <span className="sit-detail">
            {atRiskEdges.length > 0
              ? `${atRiskEdges.length} route${atRiskEdges.length > 1 ? 's' : ''} at risk`
              : closedEdges.length > 0
              ? `${closedEdges.length} closed`
              : 'All routes nominal'}
          </span>
        </div>
      </div>

      <div className="sit-divider" />

      {/* Highest Priority */}
      <div className="sit-block">
        <span className="material-symbols-outlined sit-icon">priority_high</span>
        <div className="sit-status-text">
          <span className="sit-label-upper">HIGHEST PRIORITY</span>
          <span className="sit-detail">
            {topPriority
              ? `${topPriority.facility?.name || topPriority.facility_name || topPriority.facility_id} — ${topPriority.resource?.type || topPriority.resource_name || 'Resource'}`
              : 'No critical priorities'}
          </span>
        </div>
        {topPriority && (
          <span className={`sit-badge sit-badge--${(topPriority.priority_level || 'moderate').toLowerCase()}`}>
            {topPriority.priority_level || 'MODERATE'}
          </span>
        )}
      </div>

      <div className="sit-divider" />

      {/* Recommended Action Status */}
      <div className="sit-block">
        <span className="material-symbols-outlined sit-icon">assignment</span>
        <div className="sit-status-text">
          <span className="sit-label-upper">RECOMMENDED ACTION</span>
          <span className="sit-detail">
            {actionReady
              ? `${actionPlan.selected_warehouse?.name || actionPlan.selected_warehouse?.id} → ${actionPlan.request?.target_node}`
              : topPriority
              ? 'Ready to generate action plan'
              : 'Awaiting priority selection'}
          </span>
        </div>
        {actionReady && (
          <span className="sit-badge sit-badge--ready">PLAN READY</span>
        )}
      </div>
    </div>
  )
}
