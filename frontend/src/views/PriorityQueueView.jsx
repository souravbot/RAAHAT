// PriorityQueueView — Full-page priority queue with sortable table,
// summary stats, and filter controls. Uses existing store priority data.

import { useEffect, useRef, useState, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'

const LEVEL_META = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.10)' },
  HIGH:     { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.10)' },
  MODERATE: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.10)' },
  LOW:      { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.10)' },
}

function formatDepletion(hours) {
  if (hours == null) return '—'
  if (hours <= 0) return 'DEPLETED'
  if (hours >= 24 * 7) return `${(hours / 24).toFixed(0)}d`
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`
  return `${Math.round(hours)}h`
}

export default function PriorityQueueView() {
  const priorities = useTwinStore((s) => s.priorities)
  const prioritySummary = useTwinStore((s) => s.prioritySummary)
  const priorityBusy = useTwinStore((s) => s.priorityBusy)
  const priorityError = useTwinStore((s) => s.priorityError)
  const loadPriorities = useTwinStore((s) => s.loadPriorities)
  const focusNode = useTwinStore((s) => s.focusNode)

  const [filterLevel, setFilterLevel] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [sortCol, setSortCol] = useState('priority_score')
  const [sortAsc, setSortAsc] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadPriorities().catch(() => {})
    }
  }, [loadPriorities])

  // Derived stats
  const stats = useMemo(() => {
    const s = { critical: 0, high: 0, moderate: 0, low: 0, total: priorities.length }
    priorities.forEach(p => {
      const lvl = (p.priority_level || '').toUpperCase()
      if (lvl === 'CRITICAL') s.critical++
      else if (lvl === 'HIGH') s.high++
      else if (lvl === 'MODERATE') s.moderate++
      else s.low++
    })
    return s
  }, [priorities])

  // Facility types in the data
  const facilityTypes = useMemo(() => {
    const types = new Set()
    priorities.forEach(p => {
      const t = p.facility?.type || p.facility_type
      if (t) types.add(t)
    })
    return Array.from(types)
  }, [priorities])

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...priorities]
    if (filterLevel !== 'ALL') list = list.filter(p => p.priority_level === filterLevel)
    if (filterType !== 'ALL') list = list.filter(p => (p.facility?.type || p.facility_type) === filterType)

    list.sort((a, b) => {
      let aVal = sortCol === 'facility_name' ? (a.facility?.name || a.facility_name)
               : sortCol === 'resource_name' ? (a.resource?.type || a.resource_name)
               : sortCol === 'days_to_depletion' ? (a.inputs?.hours_until_depletion ?? a.days_to_depletion)
               : a[sortCol]
      let bVal = sortCol === 'facility_name' ? (b.facility?.name || b.facility_name)
               : sortCol === 'resource_name' ? (b.resource?.type || b.resource_name)
               : sortCol === 'days_to_depletion' ? (b.inputs?.hours_until_depletion ?? b.days_to_depletion)
               : b[sortCol]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [priorities, filterLevel, filterType, sortCol, sortAsc])

  const toggleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(false) }
  }

  const sortIcon = (col) => {
    if (sortCol !== col) return 'unfold_more'
    return sortAsc ? 'arrow_upward' : 'arrow_downward'
  }

  return (
    <div className="view-queue" id="view-queue">
      {/* Header */}
      <div className="view-queue-header">
        <div className="view-panel-header">
          <div className="view-panel-title-group">
            <span className="material-symbols-outlined view-panel-icon">format_list_numbered</span>
            <h2 className="view-panel-title">Priority Queue</h2>
          </div>
          <p className="view-panel-desc">
            All facilities ranked by supply urgency. Click any row to locate the facility on the map.
          </p>
        </div>

        {/* Stats bar */}
        <div className="queue-stats-bar">
          <div className="queue-stat-chip qs-critical">
            <span className="queue-stat-num">{stats.critical}</span>
            <span className="queue-stat-lbl">Critical</span>
          </div>
          <div className="queue-stat-chip qs-high">
            <span className="queue-stat-num">{stats.high}</span>
            <span className="queue-stat-lbl">High</span>
          </div>
          <div className="queue-stat-chip qs-moderate">
            <span className="queue-stat-num">{stats.moderate}</span>
            <span className="queue-stat-lbl">Moderate</span>
          </div>
          <div className="queue-stat-chip qs-low">
            <span className="queue-stat-num">{stats.low}</span>
            <span className="queue-stat-lbl">Low</span>
          </div>
          <div className="queue-stat-chip qs-total">
            <span className="queue-stat-num">{stats.total}</span>
            <span className="queue-stat-lbl">Total</span>
          </div>
        </div>

        {/* Filters */}
        <div className="queue-filters">
          <div className="queue-filter-group">
            <label>Priority Level:</label>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="queue-filter-group">
            <label>Facility Type:</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              {facilityTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            className="queue-refresh-btn"
            onClick={() => loadPriorities()}
            disabled={priorityBusy}
          >
            <span className="material-symbols-outlined">{priorityBusy ? 'hourglass_top' : 'refresh'}</span>
            {priorityBusy ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {priorityError && (
        <div className="view-error">
          <span className="material-symbols-outlined">error</span>
          {priorityError}
        </div>
      )}

      {/* Table */}
      <div className="queue-table-wrap">
        <table className="queue-table">
          <thead>
            <tr>
              <th className="qt-rank">#</th>
              <th className="qt-sortable" onClick={() => toggleSort('facility_name')}>
                Facility
                <span className="material-symbols-outlined qt-sort-icon">{sortIcon('facility_name')}</span>
              </th>
              <th className="qt-sortable" onClick={() => toggleSort('resource_name')}>
                Resource
                <span className="material-symbols-outlined qt-sort-icon">{sortIcon('resource_name')}</span>
              </th>
              <th className="qt-sortable" onClick={() => toggleSort('priority_score')}>
                Score
                <span className="material-symbols-outlined qt-sort-icon">{sortIcon('priority_score')}</span>
              </th>
              <th className="qt-sortable" onClick={() => toggleSort('priority_level')}>
                Level
                <span className="material-symbols-outlined qt-sort-icon">{sortIcon('priority_level')}</span>
              </th>
              <th className="qt-sortable" onClick={() => toggleSort('days_to_depletion')}>
                Time Left
                <span className="material-symbols-outlined qt-sort-icon">{sortIcon('days_to_depletion')}</span>
              </th>
              <th>Current Stock</th>
              <th>Facility Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const lvl = LEVEL_META[(item.priority_level || '').toUpperCase()] || LEVEL_META.LOW
              const facName = item.facility?.name || item.facility_name || item.facility?.id || item.facility_id || '—'
              const facId = item.facility?.id || item.facility_id || ''
              const facType = item.facility?.type || item.facility_type || '—'
              const resName = item.resource?.type || item.resource_name || '—'
              const hoursLeft = item.inputs?.hours_until_depletion ?? (item.days_to_depletion != null ? item.days_to_depletion * 24 : null)
              const scoreStr = item.priority_score != null ? item.priority_score.toFixed(1) : '—'
              return (
                <tr
                  key={`${facId}-${resName}-${i}`}
                  className="queue-table-row"
                  onClick={() => facId && focusNode(facId)}
                >
                  <td className="qt-rank">{item.rank || (i + 1)}</td>
                  <td className="qt-facility">
                    <span className="qt-facility-name">{facName}</span>
                    <span className="qt-facility-id">{facId}</span>
                  </td>
                  <td>{resName}</td>
                  <td className="qt-score">{scoreStr}</td>
                  <td>
                    <span className="qt-level-badge" style={{ background: lvl.bg, color: lvl.color }}>
                      {item.priority_level || '—'}
                    </span>
                  </td>
                  <td className="qt-depletion">
                    {hoursLeft != null
                      ? formatDepletion(hoursLeft)
                      : '—'}
                  </td>
                  <td>{item.current_stock ?? '—'} {item.unit || ''}</td>
                  <td>{facType}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="qt-empty">
                  {priorityBusy ? 'Loading priorities…' : 'No priority data — run analysis to populate.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
