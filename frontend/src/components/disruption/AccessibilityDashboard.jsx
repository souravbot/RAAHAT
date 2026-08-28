// AccessibilityDashboard — Regional accessibility summary for the command center.

import { useTwinStore } from '../../state/useTwinStore'

export default function AccessibilityDashboard() {
  const villageAccessibility = useTwinStore((s) => s.villageAccessibility)

  if (!villageAccessibility || villageAccessibility.length === 0) {
    return (
      <div className="dashboard-empty">
        <div className="dashboard-title">REGIONAL ACCESSIBILITY</div>
        <div className="dashboard-loading">Calculating...</div>
      </div>
    )
  }

  const total = villageAccessibility.length
  const avg = villageAccessibility.reduce((sum, v) => sum + v.accessibility_score, 0) / total
  const high = villageAccessibility.filter(v => v.accessibility_score >= 80).length
  const moderate = villageAccessibility.filter(v => v.accessibility_score >= 50 && v.accessibility_score < 80).length
  const low = villageAccessibility.filter(v => v.accessibility_score >= 1 && v.accessibility_score < 50).length
  const isolated = villageAccessibility.filter(v => v.accessibility_score === 0).length

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">REGIONAL ACCESSIBILITY</div>
        <div className="dashboard-avg">
          <span className="avg-label">Average</span>
          <span className="avg-value">{avg.toFixed(1)}</span>
          <span className="avg-suffix">/ 100</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-item stat-high">
          <span className="stat-value">{high}</span>
          <span className="stat-label">High Access</span>
        </div>
        <div className="stat-item stat-moderate">
          <span className="stat-value">{moderate}</span>
          <span className="stat-label">Moderate</span>
        </div>
        <div className="stat-item stat-low">
          <span className="stat-value">{low}</span>
          <span className="stat-label">Low</span>
        </div>
        <div className="stat-item stat-isolated">
          <span className="stat-value">{isolated}</span>
          <span className="stat-label">Isolated</span>
        </div>
      </div>

      <div className="dashboard-total">
        <span className="total-label">Total Villages: {villageAccessibility.length}</span>
      </div>
    </div>
  )
}