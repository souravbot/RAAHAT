// RightIntelPanel — stacked right panel with Critical Alerts feed
// above a Priority Queue list. Consumes existing store data.

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

/* ---------- static mock alerts for visual completeness ---------- */
const MOCK_ALERTS = [
  {
    id: 'alert-1',
    severity: 'critical',
    title: 'Bridge BRG-04 Collapsed',
    subtitle: 'Route NH-37 segment impassable',
    time: 12,
    icon: 'warning',
  },
  {
    id: 'alert-2',
    severity: 'high',
    title: 'Medical Supplies < 48h',
    subtitle: 'Dhemaji District Hospital — insulin depleting',
    time: 34,
    icon: 'local_pharmacy',
  },
  {
    id: 'alert-3',
    severity: 'high',
    title: 'Flood Risk — Brahmaputra Tributary',
    subtitle: '3 villages in projected inundation zone',
    time: 51,
    icon: 'flood',
  },
  {
    id: 'alert-4',
    severity: 'moderate',
    title: 'Road RD-12 At Risk',
    subtitle: 'Landslide warning — alternate route available',
    time: 78,
    icon: 'landslide',
  },
  {
    id: 'alert-5',
    severity: 'moderate',
    title: 'Warehouse W-03 Low Stock',
    subtitle: 'Rice reserves below 30% threshold',
    time: 120,
    icon: 'inventory_2',
  },
]

export default function RightIntelPanel() {
  const priorities = useTwinStore((s) => s.priorities)
  const prioritySummary = useTwinStore((s) => s.prioritySummary)
  const supplyData = useTwinStore((s) => s.supplyData)
  const focusNode = useTwinStore((s) => s.focusNode)

  // Build alerts from supply data if available, else fall back to mock
  const alerts = (() => {
    if (!supplyData || supplyData.length === 0) return MOCK_ALERTS
    const list = []
    supplyData.forEach((d, i) => {
      if (Array.isArray(d.resources) && d.resources.length > 0) {
        d.resources.forEach((r, j) => {
          const stockVal = r.current_stock ?? r.stock ?? r.quantity
          const stockStr = (stockVal !== undefined && stockVal !== null) ? stockVal.toLocaleString() : 'Unknown'
          const unitStr = r.unit || 'units'
          const severity = r.supply_status || d.overall_supply_status || 'moderate'
          list.push({
            id: `supply-${i}-${j}`,
            facilityId: d.facility_id,
            severity: severity.toLowerCase(),
            title: `${r.resource_name || 'Resource'} — ${severity}`,
            subtitle: `${d.facility_name || d.facility_id} · ${stockStr} ${unitStr} remaining`,
            time: r.days_until_depletion ? r.days_until_depletion * 24 * 60 : (r.hours_until_depletion ? r.hours_until_depletion * 60 : 0),
            icon: severity.toLowerCase().includes('critical') ? 'warning' : 'local_pharmacy',
            score: r.supply_criticality_score || 0,
          })
        })
      } else {
        const stockVal = d.current_stock ?? d.stock ?? d.quantity
        const stockStr = (stockVal !== undefined && stockVal !== null) ? stockVal.toLocaleString() : 'Unknown'
        const unitStr = d.unit || 'units'
        const severity = d.criticality_level || d.overall_supply_status || 'moderate'
        list.push({
          id: `supply-${i}`,
          facilityId: d.facility_id || d.id,
          severity: severity.toLowerCase(),
          title: `${d.resource_name || (d.critical_resources?.[0]) || 'Resource'} — ${severity}`,
          subtitle: `${d.facility_name || d.facility_id || 'Facility'} · ${stockStr} ${unitStr} remaining`,
          time: d.days_to_depletion ? d.days_to_depletion * 24 * 60 : 0,
          icon: severity.toLowerCase().includes('critical') ? 'warning' : 'local_pharmacy',
          score: 0,
        })
      }
    })
    list.sort((a, b) => b.score - a.score)
    return list.length > 0 ? list.slice(0, 5) : MOCK_ALERTS
  })()

  // Use real priorities if available
  const queue = priorities && priorities.length > 0
    ? priorities.slice(0, 8)
    : []

  const criticalCount = prioritySummary?.critical ?? queue.filter(p => p.priority_level === 'CRITICAL').length
  const highCount = prioritySummary?.high ?? queue.filter(p => p.priority_level === 'HIGH').length

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
          {alerts.length === 0 && (
            <div className="intel-empty">
              <span className="material-symbols-outlined">check_circle</span>
              <span>No critical alerts</span>
            </div>
          )}
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
          {queue.length > 0 ? queue.map((item, i) => (
            <button
              key={item.facility_id + '-' + item.resource_name + '-' + i}
              className="queue-item"
              onClick={() => item.facility_id && focusNode(item.facility_id)}
              id={`queue-item-${i}`}
            >
              <span className="queue-rank">#{i + 1}</span>
              <div className="queue-item-body">
                <div className="queue-item-title">
                  {item.facility_name || item.facility_id || `Facility ${i + 1}`}
                </div>
                <div className="queue-item-meta">
                  {item.resource_name || 'Resource'} ·{' '}
                  {item.days_to_depletion != null
                    ? `${item.days_to_depletion.toFixed(1)}d remaining`
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
                <span className="queue-score">{item.priority_score?.toFixed(0) ?? '—'}</span>
              </div>
            </button>
          )) : (
            <div className="intel-empty">
              <span className="material-symbols-outlined">playlist_add_check</span>
              <span>Queue empty — run analysis to populate</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}
