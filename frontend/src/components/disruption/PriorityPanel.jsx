// PriorityPanel — RESOURCE PRIORITY intelligence for the Command Center (Phase 7).
//
// Displays the most urgent FACILITY + RESOURCE risks first, ranked by the
// backend. The frontend NEVER independently calculates priority scores — all
// displayed scores come from GET /priority.
//
// A priority item selected here focuses + highlights the facility on the
// existing Regional Digital Twin map (via the shared store selection).

import { useEffect, useRef, useState } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

const LEVEL_META = {
  CRITICAL: { color: '#dc2626', label: 'CRITICAL' },
  HIGH: { color: '#ea580c', label: 'HIGH' },
  MODERATE: { color: '#d97706', label: 'MODERATE' },
  LOW: { color: '#16a34a', label: 'LOW' },
}

function formatHours(hours) {
  if (hours == null) return '—'
  if (hours <= 0) return 'DEPLETED'
  if (hours >= 24 * 7) return `${(hours / 24).toFixed(0)} days`
  return `${Math.round(hours)}h`
}

export default function PriorityPanel() {
  const priorities = useTwinStore((s) => s.priorities)
  const prioritySummary = useTwinStore((s) => s.prioritySummary)
  const priorityBusy = useTwinStore((s) => s.priorityBusy)
  const priorityError = useTwinStore((s) => s.priorityError)
  const loadPriorities = useTwinStore((s) => s.loadPriorities)
  const focusNode = useTwinStore((s) => s.focusNode)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const simResult = useTwinStore((s) => s.simResult)

  const [viewMode, setViewMode] = useState('list') // 'list' | 'table'
  const [selectedPriority, setSelectedPriority] = useState(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadPriorities().catch(() => {})
    }
  }, [loadPriorities])

  // When a priority item is selected, focus + highlight the facility on the map.
  const handleSelect = (entry) => {
    setSelectedPriority(entry)
    focusNode(entry.facility.id)
  }

  // Simulated priorities are derived from a HYPOTHETICAL state and must be
  // clearly distinguished from LIVE priorities.
  const simPriorities = simResult?.hypothetical_priorities?.priorities || null

  const summaryCards = [
    { label: 'Critical', value: prioritySummary?.critical_priorities ?? 0, cls: 'critical' },
    { label: 'High', value: prioritySummary?.high_priorities ?? 0, cls: 'high' },
    { label: 'Moderate', value: prioritySummary?.moderate_priorities ?? 0, cls: 'moderate' },
    { label: 'Supply-Isolated', value: prioritySummary?.resupply_isolated_facilities ?? 0, cls: 'isolated' },
  ]

  return (
    <div className="priority-panel control-panel">
      <div className="control-header">
        <span className="control-title">RESOURCE PRIORITY</span>
        <span className="live-badge priority-badge">LIVE</span>
      </div>

      {priorityError && (
        <div className="control-error" onClick={() => useTwinStore.getState().clearPriorityError()}>
          {priorityError}
        </div>
      )}

      {/* Summary cards */}
      <div className="priority-summary-cards">
        {summaryCards.map((c) => (
          <div key={c.label} className={`priority-card ${c.cls}`}>
            <span className="priority-card-value">{c.value}</span>
            <span className="priority-card-label">{c.label}</span>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="priority-view-toggle">
        <button
          className={`view-toggle-btn ${viewMode === 'list' ? 'is-active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Detail
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          Table
        </button>
      </div>

      {priorityBusy && <div className="loading-indicator">Ranking resource priorities...</div>}

      {/* Simulated priorities (clearly separated from live) */}
      {simPriorities && simPriorities.length > 0 && (
        <div className="priority-sim-block">
          <div className="sim-badge priority-badge">SIMULATED {simResult.simulation_id}</div>
          <div className="priority-sim-note">
            Hypothetical priorities — live priorities are unchanged.
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <PriorityList
          entries={priorities}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelect}
        />
      ) : (
        <PriorityTable entries={priorities} onSelect={handleSelect} />
      )}

      {/* Selected priority detail */}
      {selectedPriority && (
        <PriorityDetail entry={selectedPriority} />
      )}
    </div>
  )
}

// ---------------- Detail list view ----------------
function PriorityList({ entries, selectedNodeId, onSelect }) {
  if (!entries || entries.length === 0) {
    return <div className="no-alerts">No resource priorities at this time.</div>
  }
  return (
    <div className="priority-list">
      {entries.map((entry) => {
        const meta = LEVEL_META[entry.priority_level] || LEVEL_META.LOW
        const isActive = selectedNodeId === entry.facility.id
        return (
          <button
            key={`${entry.facility.id}-${entry.resource.type}`}
            className={`priority-item ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(entry)}
          >
            <div className="priority-item-top">
              <span className="priority-rank">#{entry.rank}</span>
              <span className="priority-level" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="priority-score">{entry.priority_score.toFixed(1)}</span>
            </div>
            <div className="priority-facility">
              <span className="priority-facility-name">{entry.facility.name}</span>
              <span className="facility-type">{entry.facility.type}</span>
            </div>
            <div className="priority-resource-row">
              <span className="resource-name">{entry.resource.type.toUpperCase()}</span>
              <span className="resource-unit">w {entry.resource.weight.toFixed(2)}</span>
            </div>
            <div className="priority-meta-row">
              <span className="priority-meta">
                {formatHours(entry.inputs?.hours_until_depletion)} remaining
              </span>
              <span className="priority-meta">
                Access {Math.round(entry.inputs?.facility_accessibility_score ?? 0)}/100
              </span>
              <span className={`priority-meta ${entry.inputs?.resupply_reachable ? '' : 'resupply-blocked'}`}>
                {entry.inputs?.resupply_reachable ? 'Resupply OK' : 'Resupply BLOCKED'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ---------------- Compact ranked table ----------------
function PriorityTable({ entries, onSelect }) {
  if (!entries || entries.length === 0) {
    return <div className="no-alerts">No resource priorities at this time.</div>
  }
  return (
    <div className="priority-table-wrap">
      <table className="priority-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Facility</th>
            <th>Resource</th>
            <th>Remaining</th>
            <th>Access</th>
            <th>Resupply</th>
            <th>Score</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const meta = LEVEL_META[entry.priority_level] || LEVEL_META.LOW
            return (
              <tr
                key={`${entry.facility.id}-${entry.resource.type}`}
                onClick={() => onSelect(entry)}
                className="priority-table-row"
              >
                <td>{entry.rank}</td>
                <td>{entry.facility.id}</td>
                <td>{entry.resource.type}</td>
                <td>{formatHours(entry.inputs?.hours_until_depletion)}</td>
                <td>{Math.round(entry.inputs?.facility_accessibility_score ?? 0)}</td>
                <td className={entry.inputs?.resupply_reachable ? '' : 'resupply-blocked'}>
                  {entry.inputs?.resupply_reachable ? 'OK' : 'BLOCKED'}
                </td>
                <td className="priority-score-cell">{entry.priority_score.toFixed(1)}</td>
                <td style={{ color: meta.color }}>{meta.label}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------- Selected priority detail ----------------
function PriorityDetail({ entry }) {
  const meta = LEVEL_META[entry.priority_level] || LEVEL_META.LOW
  const inputs = entry.inputs || {}
  return (
    <div className="priority-detail">
      <div className="priority-detail-header">
        <span className="priority-detail-rank">#{entry.rank}</span>
        <span className="priority-detail-level" style={{ color: meta.color }}>
          {meta.label} · {entry.priority_score.toFixed(1)}/100
        </span>
      </div>
      <div className="priority-detail-facility">
        <strong>{entry.facility.name}</strong>
        <span className="facility-type">{entry.facility.type}</span>
      </div>
      <div className="priority-detail-resource">
        {entry.resource.type.toUpperCase()}
      </div>

      <div className="priority-detail-grid">
        <div className="priority-detail-item">
          <span className="detail-subtitle">Time remaining</span>
          <span className="detail-value">{formatHours(inputs.hours_until_depletion)}</span>
        </div>
        <div className="priority-detail-item">
          <span className="detail-subtitle">Accessibility</span>
          <span className="detail-value">
            {Math.round(inputs.facility_accessibility_score ?? 0)} / 100
          </span>
        </div>
        <div className="priority-detail-item">
          <span className="detail-subtitle">Resupply</span>
          <span className={`detail-value ${inputs.resupply_reachable ? '' : 'resupply-blocked'}`}>
            {inputs.resupply_reachable ? 'REACHABLE' : 'BLOCKED'}
          </span>
        </div>
        <div className="priority-detail-item">
          <span className="detail-subtitle">Urgency</span>
          <span className="detail-value">{Math.round(inputs.depletion_urgency_score ?? 0)}</span>
        </div>
        <div className="priority-detail-item">
          <span className="detail-subtitle">Resupply risk</span>
          <span className="detail-value">{Math.round(inputs.resupply_risk_score ?? 0)}</span>
        </div>
        <div className="priority-detail-item">
          <span className="detail-subtitle">Resource weight</span>
          <span className="detail-value">{entry.resource.weight.toFixed(2)}</span>
        </div>
      </div>

      <div className="priority-reason">“{entry.reason}”</div>
      <div className="priority-detail-hint">Selected priority → facility highlighted on map.</div>
    </div>
  )
}