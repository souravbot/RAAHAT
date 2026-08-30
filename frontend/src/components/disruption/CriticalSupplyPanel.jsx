// CriticalSupplyPanel — Displays critical supply intelligence for the Command Center.

import { useEffect, useRef } from 'react'
import { useTwinStore } from '../../state/useTwinStore'
import { fetchAllDepletion, fetchRegionalSupplySummary } from '../../api/depletionApi'

function renderVillageRows(supplyData) {
  if (!supplyData) return null;
  
  return supplyData.flatMap(facility => 
    facility.resources
      .filter(r => r.supply_status !== 'STABLE')
      .sort((a, b) => b.supply_criticality_score - a.supply_criticality_score)
      .map(resource => (
        <tr key={`${facility.facility_id}-${resource.resource_name}`}>
          <td className="facility-cell">
            <span className="facility-name">{facility.facility_name}</span>
            <span className="facility-type">{facility.facility_type}</span>
          </td>
          <td className="resource-cell">
            <span className="resource-name">{resource.resource_name}</span>
            <span className="resource-unit">{resource.unit}</span>
          </td>
          <td className="stock-cell">
            <span className="stock-value">{resource.current_stock.toLocaleString()}</span>
            <span className="stock-unit">{resource.unit}</span>
          </td>
          <td className="time-cell">
            {resource.hours_until_depletion !== null ? (
              <>
                <span className="time-hours">{resource.hours_until_depletion.toFixed(1)}h</span>
                <span className="time-days">({resource.days_until_depletion?.toFixed(1) || '0'}d)</span>
              </>
            ) : (
              <span className="time-na">
                {resource.depletion_status === 'NOT_CONSUMING' ? 'Not consuming' : 'Unknown'}
              </span>
            )}
          </td>
          <td className="resupply-cell">
            <span className={`resupply-badge ${resource.resupply.status.toLowerCase()}`}>
              {resource.resupply.reachable ? 
                `${resource.resupply.warehouse_name} (${resource.resupply.travel_cost_min?.toFixed(1) || '?'} min)` 
                : 'BLOCKED'}
            </span>
          </td>
          <td className="criticality-cell">
            <span className={`criticality-badge ${resource.supply_status.toLowerCase()}`}>
              {resource.supply_status}
            </span>
            <span className="criticality-score">{resource.supply_criticality_score.toFixed(1)}</span>
          </td>
        </tr>
      )
    )
  )
}

export default function CriticalSupplyPanel() {
  const supplyData = useTwinStore((s) => s.supplyData)
  const supplySummary = useTwinStore((s) => s.supplySummary)
  const supplyBusy = useTwinStore((s) => s.supplyBusy)
  const supplyError = useTwinStore((s) => s.supplyError)

  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      fetchAllDepletion()
      fetchRegionalSupplySummary()
    }
  }, [])

  // We'll load on mount or when needed
  return (
    <div className="supply-panel">
      <div className="supply-header">
        <div className="supply-title">CRITICAL SUPPLY INTELLIGENCE</div>
        <div className="supply-badge live-badge">LIVE SUPPLY STATE</div>
      </div>

      {supplyError && (
        <div className="supply-error" onClick={() => useTwinStore.getState().clearSupplyError()}>
          {supplyError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="supply-summary-cards">
        <div className="summary-card critical">
          <span className="summary-value">{supplySummary?.critical_facilities ?? 0}</span>
          <span className="summary-label">Critical Facilities</span>
        </div>
        <div className="summary-card high-risk">
          <span className="summary-value">{supplySummary?.high_risk_facilities ?? 0}</span>
          <span className="summary-label">High Risk Facilities</span>
        </div>
        <div className="summary-card isolated">
          <span className="summary-value">{supplySummary?.resupply_isolated_facilities ?? 0}</span>
          <span className="summary-label">Supply-Isolated</span>
        </div>
        <div className="summary-card critical-resources">
          <span className="summary-value">{supplySummary?.critical_resources ?? 0}</span>
          <span className="summary-label">Critical Resources</span>
        </div>
        <div className="summary-card depleted">
          <span className="summary-value">{supplySummary?.depleted_resources ?? 0}</span>
          <span className="summary-label">Depleted Resources</span>
        </div>
        <div className="summary-card population">
          <span className="summary-value">
            {(supplySummary?.total_population_at_risk || 0).toLocaleString()}
          </span>
          <span className="summary-label">Population at Risk</span>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="supply-alerts-section">
        <h4 className="section-title">CRITICAL SUPPLY ALERTS</h4>
        {supplyBusy && <div className="loading-indicator">Analyzing supply intelligence...</div>}
        
        {supplyError && (
          <div className="supply-error inline" onClick={() => useTwinStore.getState().clearSupplyError()}>
            {supplyError}
          </div>
        )}

        {supplyData && supplyData.length > 0 && (
          <div className="alerts-table">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Resource</th>
                  <th>Current Stock</th>
                  <th>Time Remaining</th>
                  <th>Resupply</th>
                  <th>Criticality</th>
                </tr>
              </thead>
              <tbody>
                {renderVillageRows(supplyData)}
              </tbody>
            </table>
          </div>
        )}

        {!supplyData || supplyData.length === 0 ? (
          <div className="no-alerts">
            No critical supply alerts at this time.
          </div>
        ) : null}
      </div>
    </div>
  )
}
