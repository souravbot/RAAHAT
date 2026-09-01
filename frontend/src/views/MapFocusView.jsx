// MapFocusView — Full-width focused map view with no right panel.
// Shows the map expanded across the entire main area with floating
// node/edge detail overlays.

import MapView from '../map/MapView'
import NodeDetailPanel from '../panels/NodeDetailPanel'
import EdgeDetailPanel from '../panels/EdgeDetailPanel'
import { useTwinStore } from '../state/useTwinStore'

export default function MapFocusView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const summary = useTwinStore((s) => s.summary)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  const openEdges = edges.filter(e => e.status === 'OPEN').length
  const atRiskEdges = edges.filter(e => e.status === 'AT_RISK').length
  const closedEdges = edges.filter(e => e.status === 'CLOSED').length

  return (
    <div className="view-map-focus" id="view-map-focus">
      <MapView />

      {/* Floating stats overlay */}
      <div className="map-focus-stats">
        <div className="map-focus-stat">
          <span className="material-symbols-outlined">hub</span>
          <span className="map-focus-stat-val">{summary?.total_nodes ?? nodes.length}</span>
          <span className="map-focus-stat-lbl">Nodes</span>
        </div>
        <div className="map-focus-stat">
          <span className="material-symbols-outlined">route</span>
          <span className="map-focus-stat-val">{summary?.total_edges ?? edges.length}</span>
          <span className="map-focus-stat-lbl">Routes</span>
        </div>
        <div className="map-focus-divider" />
        <div className="map-focus-stat mfs-ok">
          <span className="map-focus-stat-val">{openEdges}</span>
          <span className="map-focus-stat-lbl">Open</span>
        </div>
        <div className="map-focus-stat mfs-warn">
          <span className="map-focus-stat-val">{atRiskEdges}</span>
          <span className="map-focus-stat-lbl">At Risk</span>
        </div>
        <div className="map-focus-stat mfs-danger">
          <span className="map-focus-stat-val">{closedEdges}</span>
          <span className="map-focus-stat-lbl">Closed</span>
        </div>
      </div>

      {/* Floating legend */}
      <div className="map-focus-legend">
        <div className="map-focus-legend-title">
          <span className="material-symbols-outlined">map</span>
          Regional Digital Twin — Full View
        </div>
        <p className="map-focus-legend-hint">
          Click any node or route on the map to inspect details.
        </p>
      </div>

      {/* Node/Edge detail overlay */}
      {(selectedNode || selectedEdge) && (
        <div className="map-focus-detail">
          {selectedNode && <NodeDetailPanel node={selectedNode} />}
          {selectedEdge && <EdgeDetailPanel edge={selectedEdge} />}
        </div>
      )}
    </div>
  )
}
