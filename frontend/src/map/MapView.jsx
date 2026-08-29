// MapView — assembles the Leaflet map: tile layer, edges, nodes, legend.
// Auto-fits bounds from twin node coordinates and supports selection.

import { useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { useTwinStore } from '../state/useTwinStore'
import NodeMarker from './NodeMarker'
import EdgeLine from './EdgeLine'
import MapLegend from './MapLegend'
import { NODE_META } from './icons'

// Fix default marker icon paths (react-leaflet + bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function useFitBounds(map) {
  const nodes = useTwinStore((s) => s.nodes)
  useEffect(() => {
    if (map && nodes.length > 0) {
      const bounds = []
      nodes.forEach((n) => bounds.push([n.lat, n.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, nodes])
}

export default function MapView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const nodesById = useTwinStore((s) => s.nodesById)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectNode = useTwinStore((s) => s.selectNode)
  const selectEdge = useTwinStore((s) => s.selectEdge)
  const setMapRef = useTwinStore((s) => s.setMapRef)
  const villageAccessibility = useTwinStore((s) => s.villageAccessibility)

  const byId = nodesById()
  const getVillageAccess = (villageId) => 
    villageAccessibility?.find(v => v.village_id === villageId)?.accessibility_score

  return (
    <div className="map-host">
      <MapContainer
        className="map"
        center={[26.14, 92.0]}
        zoom={7}
        ref={setMapRef}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsLayer />
        {edges.map((edge) => (
          <EdgeLine
            key={edge.id}
            edge={edge}
            source={byId.get(edge.connects[0])}
            target={byId.get(edge.connects[1])}
            selected={selectedEdgeId === edge.id}
            onSelect={selectEdge}
          />
        ))}
        {nodes.map((node) => {
          const accessibilityScore = node.type === 'VILLAGE' 
            ? villageAccessibility?.find(v => v.village_id === node.id)?.accessibility_score
            : undefined
          
          return (
            <NodeMarker
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={selectNode}
              accessibilityScore={accessibilityScore}
            />
          )
        })}
      </MapContainer>
      <MapLegend />
    </div>
  )
}

// Internal component to hydrate fitBounds via the map instance.
function FitBoundsLayer() {
  const map = useTwinStore((s) => s.mapRef)
  useFitBounds(map)
  return null
}
