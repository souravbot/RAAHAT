// RightIntelPanel — stacked right panel with Critical Alerts feed
// above a Priority Queue list. Consumes real backend store data.

import { useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'

/* ---------- severity helpers ---------- */
function severityColor(level) {
  switch (level?.toLowerCase()) {
    case 'critical': return '#dc2626'
    case 'high':
    case 'high_risk': return '#E8871E'
    case 'moderate':
    case 'watch': return '#d4a017'
    default: return '#086D35'
  }
}

function timeSince(minutesAgo) {
  if (!minutesAgo && minutesAgo !== 0) return 'just now'
  if (minutesAgo < 1) return 'just now'
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m ago`
  return `${Math.round(minutesAgo / 60)}h ago`
}

export default function RightIntelPanel() {
  const priorities = useTwinStore((s) => s.priorities)
  const prioritySummary = useTwinStore((s) => s.prioritySummary)
  const priorityBusy = useTwinStore((s) => s.priorityBusy)
  const priorityError = useTwinStore((s) => s.priorityError)
  const supplyData = useTwinStore((s) => s.supplyData)
  const supplyBusy = useTwinStore((s) => s.supplyBusy)
  const supplyError = useTwinStore((s) => s.supplyError)
  const focusNode = useTwinStore((s) => s.focusNode)

  // Build real alerts strictly from live supply data
  const alerts = useMemo(() => {
    if (!supplyData || supplyData.length === 0) return []
    const list = []
    supplyData.forEach((d, i) => {
      if (Array.isArray(d.resources) && d.resources.length > 0) {
        d.resources.forEach((r, j) => {
          const status = r.supply_status || 'STABLE'
          if (status === 'STABLE') return

          const stockVal = r.current_stock ?? r.stock ?? r.quantity
          const stockStr = (stockVal !== undefined && stockVal !== null) ? stockVal.toLocaleString() : 'Unknown'
          const unitStr = r.unit || 'units'
          const severity = status.toLowerCase()

          list.push({
            id: `supply-${d.facility_id || i}-${r.resource_name || j}`,
            facilityId: d.facility_id,
            severity,
            title: `${r.resource_name ? r.resource_name.toUpperCase() : 'RESOURCE'} — ${status.replace('_', ' ')}`,
            subtitle: `${d.facility_name || d.facility_id} · ${stockStr} ${unitStr} remaining`,
            time: r.days_until_depletion ? r.days_until_depletion * 24 * 60 : (r.hours_until_depletion ? r.hours_until_depletion * 60 : 0),
            icon: severity.includes('critical') ? 'warning' : 'local_pharmacy',
            score: r.supply_criticality_score || 0,
          })
        })
      }
    })
    list.sort((a, b) => b.score - a.score)
    return list.slice(0, 10)
  }, [supplyData])

  // Real priority queue from backend
  const queue = priorities && priorities.length > 0
    ? priorities.slice(0, 8)
    : []

  const criticalCount = prioritySummary?.critical_priorities ?? queue.filter(p => p.priority_level === 'CRITICAL').length
  const highCount = prioritySummary?.high_priorities ?? queue.filter(p => p.priority_level === 'HIGH').length

  return (
    <aside className="right-intel-panel" id="right-intel-panel">
      {/* ============ CRITICAL ALERTS ============ */}
      <section className="intel-section alerts-section">
        <div className="intel-section-header">
          <div className="intel-section-title-group">
            <span className="material-symbols-outlined intel-section-icon alert-icon-glow">
              notifications_active
            </span>
            <h2 className="intel-section-title">Critical Alerts</h2>
          </div>
          <span className="intel-count-badge alert-count">
            {alerts.length}
          </span>
        </div>

        <div className="alerts-feed" id="alerts-feed">
          {supplyBusy && alerts.length === 0 && (
            <div className="intel-empty">
              <span className="material-symbols-outlined">hourglass_top</span>
              <span>Analyzing regional supply status...</span>
            </div>
          )}
          {supplyError && (
            <div className="intel-empty error-text">
              <span className="material-symbols-outlined">error</span>
              <span>Unable to load supply intelligence.</span>
            </div>
          )}
          {!supplyBusy && !supplyError && alerts.length === 0 && (
            <div className="intel-empty">
              <span className="material-symbols-outlined">check_circle</span>
              <span>No critical supply alerts detected.</span>
            </div>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-card severity-${alert.severity}`}
              id={`alert-${alert.id}`}
              onClick={() => alert.facilityId && focusNode(alert.facilityId)}
            >
              <div className="alert-card-left">
                <span
                  className="alert-severity-dot"
                  style={{ background: severityColor(alert.severity) }}
                />
                <span className="material-symbols-outlined alert-card-icon">
                  {alert.icon}
                </span>
              </div>
              <div className="alert-card-body">
                <div className="alert-card-title">{alert.title}</div>
                <div className="alert-card-subtitle">{alert.subtitle}</div>
              </div>
              <div className="alert-card-time">
                {timeSince(alert.time)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PRIORITY QUEUE ============ */}
      <section className="intel-section queue-section">
        <div className="intel-section-header">
          <div className="intel-section-title-group">
            <span className="material-symbols-outlined intel-section-icon">
              format_list_numbered
            </span>
            <h2 className="intel-section-title">Priority Queue</h2>
          </div>
          <div className="queue-summary-pills">
            {criticalCount > 0 && (
              <span className="queue-pill pill-critical">{criticalCount} Critical</span>
            )}
            {highCount > 0 && (
              <span className="queue-pill pill-high">{highCount} High</span>
            )}
          </div>
        </div>

        <div className="priority-queue-list" id="priority-queue-list">
          {priorityBusy && queue.length === 0 && (
            <div className="intel-empty">
              <span className="material-symbols-outlined">hourglass_top</span>
              <span>Calculating regional priorities...</span>
            </div>
          )}
          {priorityError && (
            <div className="intel-empty error-text">
              <span className="material-symbols-outlined">error</span>
              <span>Unable to load priority intelligence.</span>
            </div>
          )}
          {!priorityBusy && !priorityError && queue.length === 0 && (
            <div className="intel-empty">
              <span className="material-symbols-outlined">playlist_add_check</span>
              <span>No active priorities</span>
            </div>
          )}
          {queue.map((item, i) => {
            const facName = item.facility?.name || item.facility_name || item.facility?.id || item.facility_id || `Facility ${i + 1}`
            const facId = item.facility?.id || item.facility_id
            const resName = item.resource?.type || item.resource_name || 'Resource'
            const hoursLeft = item.inputs?.hours_until_depletion ?? (item.days_to_depletion != null ? item.days_to_depletion * 24 : null)
            const scoreVal = item.priority_score != null ? item.priority_score.toFixed(1) : '—'
            return (
              <button
                key={`${facId}-${resName}-${i}`}
                className="queue-item"
                onClick={() => facId && focusNode(facId)}
                id={`queue-item-${i}`}
              >
                <span className="queue-rank">#{item.rank || (i + 1)}</span>
                <div className="queue-item-body">
                  <div className="queue-item-title">
                    {facName}
                  </div>
                  <div className="queue-item-meta">
                    {resName} ·{' '}
                    {hoursLeft != null
                      ? `${(hoursLeft / 24).toFixed(1)}d remaining`
                      : 'depleted'}
                  </div>
                </div>
                <div className="queue-item-right">
                  <span
                    className="queue-level-badge"
                    style={{ background: severityColor(item.priority_level?.toLowerCase()) }}
                  >
                    {item.priority_level || 'WATCH'}
                  </span>
                  <span className="queue-score">{scoreVal}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
