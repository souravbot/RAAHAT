// RouteOverlay — draws the recommended delivery route + vehicle approach on the
// existing RAAHAT map (Phase 8). Integrates with the live Regional Digital Twin
// map; it never replaces the existing map or its infrastructure layers.

import { Polyline, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import { useTwinStore } from '../state/useTwinStore'
import { NODE_META } from './icons'

// Custom divIcon for the vehicle marker (🚚)
function vehicleIcon() {
  return L.divIcon({
    html: '<div class="action-vehicle-marker">🚚</div>',
    className: 'action-marker-wrap',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

// Custom divIcon for the target/shortage marker (🚨)
function targetIcon() {
  return L.divIcon({
    html: '<div class="action-target-marker">🚨</div>',
    className: 'action-marker-wrap',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function RouteOverlay() {
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const nodesById = useTwinStore((s) => s.nodesById)
  const edgesById = useTwinStore((s) => s.edgesById)

  if (actionPlan?.success !== true) return null

  const byId = nodesById()
  const byEdgeId = edgesById()

  const route = actionPlan.selected_route
  const vehicleRoute = actionPlan.vehicle_to_warehouse_route
  const warehouseId = actionPlan.selected_warehouse?.id
  const targetId = actionPlan.request?.target_node
  const vehicleId = actionPlan.selected_vehicle?.id
  const vehicleNode = actionPlan.selected_vehicle?.current_node

  // Determine which edge IDs belong to each route for coloring.
  const routeEdgeIds = new Set((route?.edges || []).map((e) => e.edge_id))
  const vehicleEdgeIds = new Set((vehicleRoute?.edges || []).map((e) => e.edge_id))

  const segmentStatus = (edgeId) => {
    const e = byEdgeId.get(edgeId)
    return e ? e.status : 'OPEN'
  }

  return (
    <>
      {/* Delivery route (warehouse -> target) */}
      {(route?.edges || []).map((edge, i) => {
        const e = byEdgeId.get(edge.edge_id)
        if (!e) return null
        const source = byId.get(edge.source)
        const target = byId.get(edge.target)
        if (!source || !target) return null
        const status = edge.status
        const isAtRisk = status === 'AT_RISK'
        return (
          <Polyline
            key={`route-${edge.edge_id}-${i}`}
            positions={[[source.lat, source.lng], [target.lat, target.lng]]}
            pathOptions={{
              color: isAtRisk ? '#ff8800' : '#0284c7',
              weight: 6,
              opacity: 0.95,
              dashArray: isAtRisk ? '8 6' : undefined,
            }}
          />
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
              weight: 3,
              opacity: 0.7,
              dashArray: '4 4',
            }}
          />
        )
      })}

      {/* Warehouse (📦) */}
      {warehouseId && byId.get(warehouseId) && (
        <Marker
          position={[byId.get(warehouseId).lat, byId.get(warehouseId).lng]}
          icon={warehouseIcon()}
        />
      )}

      {/* Vehicle (🚚) at its current node */}
      {vehicleNode && byId.get(vehicleNode) && (
        <Marker
          position={[byId.get(vehicleNode).lat, byId.get(vehicleNode).lng]}
          icon={vehicleIcon()}
        />
      )}

      {/* Target shortage (🚨) */}
      {targetId && byId.get(targetId) && (
        <>
          <Circle
            center={[byId.get(targetId).lat, byId.get(targetId).lng]}
            radius={200}
            pathOptions={{ color: '#dc2626', weight: 2, fillOpacity: 0.25 }}
          />
          <Marker
            position={[byId.get(targetId).lat, byId.get(targetId).lng]}
            icon={targetIcon()}
          />
        </>
      )}
    </>
  )
}

function warehouseIcon() {
  return L.divIcon({
    html: '<div class="action-warehouse-marker">📦</div>',
    className: 'action-marker-wrap',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}