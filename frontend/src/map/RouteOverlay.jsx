// RouteOverlay — draws the recommended delivery route + vehicle approach on the
// existing RAAHAT map (Phase 8). Integrates with the live Regional Digital Twin
// map with professional SVG badges, animated directional pathing, and isolated state visualization.

import { Polyline, Circle, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useTwinStore } from '../state/useTwinStore'

// Custom divIcon for the source warehouse marker
function warehouseIcon(name) {
  return L.divIcon({
    html: `
      <div class="action-warehouse-marker" title="Source Warehouse: ${name || ''}">
        <span class="action-marker-ring"></span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6"></path>
        </svg>
      </div>`,
    className: 'action-marker-wrap',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Custom divIcon for the assigned vehicle marker
function vehicleIcon(vehicleId) {
  return L.divIcon({
    html: `
      <div class="action-vehicle-marker" title="Assigned Vehicle: ${vehicleId || ''}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>`,
    className: 'action-marker-wrap',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

// Custom divIcon for the target/shortage destination marker
function targetIcon(targetName) {
  return L.divIcon({
    html: `
      <div class="action-target-marker" title="Destination Target: ${targetName || ''}">
        <span class="action-marker-ring ring-target"></span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="5"></circle>
          <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
        </svg>
      </div>`,
    className: 'action-marker-wrap',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

// Custom divIcon for isolated destination with no accessible route
function isolatedTargetIcon(targetName) {
  return L.divIcon({
    html: `
      <div class="action-isolated-marker" title="Isolated Target: ${targetName || ''}">
        <span class="action-marker-ring ring-isolated"></span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </div>`,
    className: 'action-marker-wrap',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

export default function RouteOverlay() {
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const nodesById = useTwinStore((s) => s.nodesById)
  const edgesById = useTwinStore((s) => s.edgesById)

  const byId = nodesById()
  const byEdgeId = edgesById()

  // Handle Isolated Target / Blocked State (actionPlan failed)
  if (actionPlan?.success === false) {
    const targetId = actionPlan.request?.target_node
    const targetNode = targetId ? byId.get(targetId) : null
    if (!targetNode) return null

    return (
      <>
        <Circle
          center={[targetNode.lat, targetNode.lng]}
          radius={300}
          pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.2, weight: 2, dashArray: '6, 6' }}
        />
        <Marker
          position={[targetNode.lat, targetNode.lng]}
          icon={isolatedTargetIcon(targetNode.name)}
        >
          <Tooltip direction="top" offset={[0, -18]} opacity={0.96} permanent className="raahat-map-tooltip">
            <div className="tooltip-hazard-header">
              <span className="hazard-alert-tag">NO ACCESSIBLE ROUTE</span>
              <span className="tooltip-node-id">{targetNode.id}</span>
            </div>
            <div className="tooltip-node-title">{targetNode.name}</div>
            <div className="tooltip-node-line line-isolated">
              Status: ISOLATED · All ground corridors CLOSED
            </div>
          </Tooltip>
        </Marker>
      </>
    )
  }

  if (actionPlan?.success !== true) return null

  const route = actionPlan.selected_route
  const vehicleRoute = actionPlan.vehicle_to_warehouse_route
  const warehouseId = actionPlan.selected_warehouse?.id
  const targetId = actionPlan.request?.target_node
  const vehicleId = actionPlan.selected_vehicle?.id
  const vehicleNode = actionPlan.selected_vehicle?.current_node

  const warehouseNode = warehouseId ? byId.get(warehouseId) : null
  const targetNode = targetId ? byId.get(targetId) : null
  const vehicleLocNode = vehicleNode ? byId.get(vehicleNode) : null

  return (
    <>
      {/* Delivery route (warehouse -> target): Thick directional highlighted line */}
      {(route?.edges || []).map((edge, i) => {
        const source = byId.get(edge.source)
        const target = byId.get(edge.target)
        if (!source || !target) return null
        const isAtRisk = edge.status === 'AT_RISK'
        return (
          <Polyline
            key={`route-${edge.edge_id}-${i}`}
            positions={[[source.lat, source.lng], [target.lat, target.lng]]}
            pathOptions={{
              color: isAtRisk ? '#ff9800' : '#0284c7',
              weight: 6.5,
              opacity: 0.95,
              dashArray: '10, 6',
              className: 'raahat-recommended-route',
            }}
          >
            <Tooltip direction="center" opacity={0.96} className="raahat-map-tooltip">
              <div className="tooltip-node-header">
                <span className="tooltip-status-pill status-open" style={{ background: '#0284c7' }}>
                  RECOMMENDED ACTION ROUTE
                </span>
                <span className="tooltip-node-id">{edge.edge_id}</span>
              </div>
              <div className="tooltip-node-title">{source.name} → {target.name}</div>
              <div className="tooltip-node-line">
                Segment Distance: <strong>{edge.distance_km || 0} km</strong>
              </div>
            </Tooltip>
          </Polyline>
        )
      })}

      {/* Vehicle approach route (vehicle -> warehouse) */}
      {(vehicleRoute?.edges || []).map((edge, i) => {
        const source = byId.get(edge.source)
        const target = byId.get(edge.target)
        if (!source || !target) return null
        return (
          <Polyline
            key={`vroute-${edge.edge_id}-${i}`}
            positions={[[source.lat, source.lng], [target.lat, target.lng]]}
            pathOptions={{
              color: '#7c3aed',
              weight: 3.5,
              opacity: 0.85,
              dashArray: '6, 6',
              className: 'raahat-vehicle-approach-route',
            }}
          />
        )
      })}

      {/* Source Warehouse Marker */}
      {warehouseNode && (
        <Marker
          position={[warehouseNode.lat, warehouseNode.lng]}
          icon={warehouseIcon(warehouseNode.name)}
        >
          <Tooltip direction="top" offset={[0, -18]} opacity={0.96} className="raahat-map-tooltip">
            <div className="tooltip-node-header">
              <span className="tooltip-node-badge" style={{ background: '#2563eb' }}>SOURCE WAREHOUSE</span>
              <span className="tooltip-node-id">{warehouseNode.id}</span>
            </div>
            <div className="tooltip-node-title">{warehouseNode.name}</div>
          </Tooltip>
        </Marker>
      )}

      {/* Vehicle Location Marker */}
      {vehicleLocNode && (
        <Marker
          position={[vehicleLocNode.lat, vehicleLocNode.lng]}
          icon={vehicleIcon(vehicleId)}
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={0.96} className="raahat-map-tooltip">
            <div className="tooltip-node-header">
              <span className="tooltip-node-badge" style={{ background: '#051960' }}>ASSIGNED VEHICLE</span>
              <span className="tooltip-node-id">{vehicleId}</span>
            </div>
            <div className="tooltip-node-title">At: {vehicleLocNode.name}</div>
          </Tooltip>
        </Marker>
      )}

      {/* Target Destination Marker */}
      {targetNode && (
        <>
          <Circle
            center={[targetNode.lat, targetNode.lng]}
            radius={250}
            pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.25, weight: 2 }}
          />
          <Marker
            position={[targetNode.lat, targetNode.lng]}
            icon={targetIcon(targetNode.name)}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={0.96} className="raahat-map-tooltip">
              <div className="tooltip-node-header">
                <span className="tooltip-node-badge" style={{ background: '#dc2626' }}>DESTINATION TARGET</span>
                <span className="tooltip-node-id">{targetNode.id}</span>
              </div>
              <div className="tooltip-node-title">{targetNode.name}</div>
              <div className="tooltip-node-line">
                Required: <strong>{actionPlan.request?.required_quantity} units {actionPlan.request?.resource}</strong>
              </div>
            </Tooltip>
          </Marker>
        </>
      )}
    </>
  )
}