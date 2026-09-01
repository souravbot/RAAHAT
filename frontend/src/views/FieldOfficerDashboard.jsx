// FieldOfficerDashboard — Simplified, operational dashboard for Field Officers.
// Focuses on:
// 1. What is happening? (Active Alerts)
// 2. What needs my attention? (Priority Levels & Assignments)
// 3. What action should I take? (Action Plans)
// 4. Which route should I follow? (Recommended Routes)

import { useState } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'
import AssistantPanel from '../components/disruption/AssistantPanel'

export default function FieldOfficerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'map' | 'alerts' | 'assignments' | 'routes' | 'resources' | 'assistant'

  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const supplyData = useTwinStore((s) => s.supplyData)
  const priorities = useTwinStore((s) => s.priorities)
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const focusNode = useTwinStore((s) => s.focusNode)

  const openEdges = edges.filter((e) => e.status === 'OPEN').length
  const atRiskEdges = edges.filter((e) => e.status === 'AT_RISK').length
  const closedEdges = edges.filter((e) => e.status === 'CLOSED').length

  // Build field officer alerts list
  const alerts = (supplyData || []).flatMap((facility) =>
    (facility.resources || [])
      .filter((r) => r.supply_status !== 'STABLE')
      .map((r) => ({
        id: `${facility.facility_id}-${r.resource_name}`,
        facilityId: facility.facility_id,
        facilityName: facility.facility_name,
        facilityType: facility.facility_type,
        resource: r.resource_name,
        stock: r.current_stock,
        unit: r.unit,
        hours: r.hours_until_depletion,
        status: r.supply_status,
        resupplyStatus: r.resupply?.status?.value || r.resupply?.status || 'NORMAL',
        travelCost: r.resupply?.travel_cost_min,
      }))
  )

  const criticalCount = alerts.filter((a) => a.status === 'CRITICAL').length
  const highCount = alerts.filter((a) => a.status === 'HIGH_RISK').length

  return (
    <div className="field-officer-view" id="field-officer-dashboard">
      {/* Field Officer Sub-Header Navigation */}
      <div className="field-officer-nav-bar">
        <div className="field-officer-role-title">
          <span className="material-symbols-outlined fo-badge-icon">badge</span>
          <div>
            <div className="fo-title">Field Officer Control</div>
            <div className="fo-sub">Operational Response & Route Guidance</div>
          </div>
        </div>

        <div className="field-officer-tabs">
          <button
            className={`fo-tab ${activeTab === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </button>
          <button
            className={`fo-tab ${activeTab === 'map' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <span className="material-symbols-outlined">map</span>
            Live Map
          </button>
          <button
            className={`fo-tab ${activeTab === 'alerts' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <span className="material-symbols-outlined">notifications_active</span>
            Alerts ({alerts.length})
          </button>
          <button
            className={`fo-tab ${activeTab === 'assignments' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <span className="material-symbols-outlined">assignment</span>
            My Assignments
          </button>
          <button
            className={`fo-tab ${activeTab === 'routes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            <span className="material-symbols-outlined">alt_route</span>
            Recommended Routes
          </button>
          <button
            className={`fo-tab ${activeTab === 'resources' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <span className="material-symbols-outlined">inventory_2</span>
            Resources
          </button>
          <button
            className={`fo-tab ${activeTab === 'assistant' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <span className="material-symbols-outlined">chat</span>
            RAAHAT Assistant
          </button>
        </div>
      </div>

      {/* Main Field Officer Content */}
      <div className="field-officer-content">
        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="fo-dashboard-grid">
            {/* Top Operational Cards */}
            <div className="fo-card-row">
              <div className="fo-kpi-card fo-kpi-danger">
                <span className="material-symbols-outlined fo-kpi-icon">warning</span>
                <div className="fo-kpi-body">
                  <div className="fo-kpi-val">{criticalCount}</div>
                  <div className="fo-kpi-lbl">Critical Alerts</div>
                </div>
              </div>
              <div className="fo-kpi-card fo-kpi-warn">
                <span className="material-symbols-outlined fo-kpi-icon">error_med</span>
                <div className="fo-kpi-body">
                  <div className="fo-kpi-val">{highCount}</div>
                  <div className="fo-kpi-lbl">High Risk Facilities</div>
                </div>
              </div>
              <div className="fo-kpi-card fo-kpi-info">
                <span className="material-symbols-outlined fo-kpi-icon">local_shipping</span>
                <div className="fo-kpi-body">
                  <div className="fo-kpi-val">{actionPlan ? '1 Active' : 'Standby'}</div>
                  <div className="fo-kpi-lbl">Assigned Dispatch</div>
                </div>
              </div>
              <div className="fo-kpi-card fo-kpi-ok">
                <span className="material-symbols-outlined fo-kpi-icon">route</span>
                <div className="fo-kpi-body">
                  <div className="fo-kpi-val">{openEdges}/{edges.length}</div>
                  <div className="fo-kpi-lbl">Routes Operational</div>
                </div>
              </div>
            </div>

            {/* Split view: Active Alerts + Map Preview */}
            <div className="fo-split-view">
              <div className="fo-panel fo-alerts-panel">
                <div className="fo-panel-title">
                  <span className="material-symbols-outlined">notifications_active</span>
                  Active Disruption & Supply Alerts
                </div>
                <div className="fo-alert-list">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`fo-alert-item severity-${a.status.toLowerCase()}`}
                      onClick={() => focusNode(a.facilityId)}
                    >
                      <div className="fo-alert-left">
                        <span className="material-symbols-outlined fo-alert-icon">
                          {a.status === 'CRITICAL' ? 'warning' : 'local_pharmacy'}
                        </span>
                        <div>
                          <strong className="fo-alert-name">{a.facilityName}</strong>
                          <div className="fo-alert-meta">
                            {a.resource} · {a.stock?.toLocaleString()} {a.unit} remaining
                          </div>
                        </div>
                      </div>
                      <div className="fo-alert-right">
                        <span className={`fo-status-tag tag-${a.status.toLowerCase()}`}>
                          {a.status}
                        </span>
                        <span className="fo-time-hrs">
                          {a.hours ? `${a.hours.toFixed(1)}h left` : 'Depleted'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="fo-empty-msg">No active critical alerts in your region.</div>
                  )}
                </div>
              </div>

              {/* Map Preview */}
              <div className="fo-panel fo-map-preview-panel">
                <div className="fo-panel-title">
                  <span className="material-symbols-outlined">map</span>
                  Regional Transport Network Map
                </div>
                <div className="fo-map-host">
                  <MapView />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Map */}
        {activeTab === 'map' && (
          <div className="fo-full-map-wrap">
            <MapView />
          </div>
        )}

        {/* Tab 3: Detailed Alerts */}
        {activeTab === 'alerts' && (
          <div className="fo-full-alerts-wrap">
            <div className="view-panel-header">
              <h2 className="view-panel-title">Disruption & Inventory Alerts</h2>
              <p className="view-panel-desc">
                Operational status of regional medical facilities and supply centers.
              </p>
            </div>
            <div className="fo-alert-grid">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`fo-alert-card card-${a.status.toLowerCase()}`}
                  onClick={() => focusNode(a.facilityId)}
                >
                  <div className="fo-card-top">
                    <span className="fo-card-facility">{a.facilityName}</span>
                    <span className={`fo-status-tag tag-${a.status.toLowerCase()}`}>{a.status}</span>
                  </div>
                  <div className="fo-card-resource">{a.resource}</div>
                  <div className="fo-card-stock">
                    Current Stock: <strong>{a.stock?.toLocaleString()} {a.unit}</strong>
                  </div>
                  <div className="fo-card-time">
                    Estimated Depletion: <strong>{a.hours ? `${a.hours.toFixed(1)} hours` : 'Immediate'}</strong>
                  </div>
                  <div className="fo-card-resupply">
                    Resupply Status: <strong>{a.resupplyStatus}</strong> ({a.travelCost?.toFixed(1) || '?'} min)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: My Assignments */}
        {activeTab === 'assignments' && (
          <div className="fo-assignments-wrap">
            <div className="view-panel-header">
              <h2 className="view-panel-title">Field Assignments & Action Plans</h2>
              <p className="view-panel-desc">
                Active resource dispatch orders assigned to your regional response unit.
              </p>
            </div>
            {actionPlan && actionPlan.success ? (
              <div className="fo-action-card">
                <div className="fo-action-header">
                  <span className="material-symbols-outlined fo-action-icon">local_shipping</span>
                  <div>
                    <h3>Active Dispatch Order</h3>
                    <span>Vehicle: {actionPlan.selected_vehicle?.id} ({actionPlan.selected_vehicle?.type})</span>
                  </div>
                </div>
                <div className="fo-action-details">
                  <div className="fo-detail-row">
                    <span>Source Depot:</span>
                    <strong>{actionPlan.selected_warehouse?.name}</strong>
                  </div>
                  <div className="fo-detail-row">
                    <span>Destination Facility:</span>
                    <strong>{actionPlan.request?.target_node}</strong>
                  </div>
                  <div className="fo-detail-row">
                    <span>Estimated Transit Time:</span>
                    <strong>{actionPlan.delivery_plan?.estimated_time_min?.toFixed(1)} minutes</strong>
                  </div>
                  <div className="fo-detail-row">
                    <span>Explanation:</span>
                    <p>{actionPlan.explanation}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="fo-empty-card">
                <span className="material-symbols-outlined">assignment_turned_in</span>
                <h3>No Active Dispatch Assigned</h3>
                <p>All regional supply routes are currently operating normally. Stand by for command dispatch.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Recommended Routes */}
        {activeTab === 'routes' && (
          <div className="fo-routes-wrap">
            <div className="view-panel-header">
              <h2 className="view-panel-title">Recommended Supply Routes</h2>
              <p className="view-panel-desc">
                Risk-adjusted operational corridors between regional warehouses and hospitals.
              </p>
            </div>
            <div className="fo-routes-list">
              {edges.map((e) => (
                <div key={e.id} className="fo-route-item">
                  <span className={`fo-route-status rs-${e.status.toLowerCase()}`}>{e.status}</span>
                  <div className="fo-route-info">
                    <strong>Route {e.id}</strong> — {e.connects.join(' ↔ ')}
                  </div>
                  <div className="fo-route-meta">
                    Risk: {e.risk_score}/100 · Distance: {e.distance_km?.toFixed(1)} km · Est: {e.base_travel_time_min?.toFixed(0)} min
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Resources */}
        {activeTab === 'resources' && (
          <div className="fo-resources-wrap">
            <div className="view-panel-header">
              <h2 className="view-panel-title">Regional Supply Availability</h2>
              <p className="view-panel-desc">
                Live inventory tracking across regional warehouses and hospitals.
              </p>
            </div>
            <div className="fo-resources-table-wrap">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Critical Resources</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplyData || []).map((f) => (
                    <tr key={f.facility_id}>
                      <td className="qt-facility-name">{f.facility_name || f.facility_id}</td>
                      <td>{f.facility_type}</td>
                      <td>
                        <span className={`qt-level-badge tag-${(f.overall_supply_status || 'stable').toLowerCase()}`}>
                          {f.overall_supply_status || 'STABLE'}
                        </span>
                      </td>
                      <td>{(f.critical_resources || []).join(', ') || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: RAAHAT Assistant */}
        {activeTab === 'assistant' && (
          <div className="fo-assistant-wrap">
            <AssistantPanel />
          </div>
        )}
      </div>
    </div>
  )
}
