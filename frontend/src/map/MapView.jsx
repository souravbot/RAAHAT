// MapView — assembles the Leaflet map: ESRI Light Gray tile layer, animated edges,
// marker clustering with custom navy badges, accessibility rings, and auto-fit bounds.

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useTwinStore } from '../state/useTwinStore'
import NodeMarker from './NodeMarker'
import EdgeLine from './EdgeLine'
import MapLegend from './MapLegend'
import RouteOverlay from './RouteOverlay'

// Fix default marker icon paths (react-leaflet + bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom Cluster Badge in brand --navy-500
const createClusterCustomIcon = function (cluster) {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="raahat-cluster-badge"><span>${count}</span></div>`,
    className: 'custom-marker-cluster-wrap',
    iconSize: L.point(34, 34, true),
  })
}

// Auto-fit bounds on load and node state changes
function FitBoundsLayer() {
  const map = useMap()
  const nodes = useTwinStore((s) => s.nodes)
  const setMapRef = useTwinStore((s) => s.setMapRef)

  useEffect(() => {
    if (map) {
      setMapRef(map)
    }
  }, [map, setMapRef])

  useEffect(() => {
    if (map && nodes && nodes.length > 0) {
      const bounds = nodes.map((n) => [n.lat, n.lng])
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 11,
        animate: false,
      })
    }
  }, [map, nodes])

  return null
}

export default function MapView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const nodesById = useTwinStore((s) => s.nodesById)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectNode = useTwinStore((s) => s.selectNode)
  const selectEdge = useTwinStore((s) => s.selectEdge)
  const villageAccessibility = useTwinStore((s) => s.villageAccessibility)

  const byId = nodesById()

  return (
    <div className="map-host">
      <MapContainer
        className="map"
        center={[26.14, 92.0]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <FitBoundsLayer />
        
        {/* Render animated route lines */}
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

        {/* Marker Clustering Group — collapses dense clusters (e.g. Guwahati) */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={28}
          disableClusteringAtZoom={12}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          spiderLegPolylineOptions={{ weight: 1.5, color: '#051960', opacity: 0.6 }}
        >
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
        </MarkerClusterGroup>

        {/* Phase 8: recommended action route overlay */}
        <RouteOverlay />
      </MapContainer>
      <MapLegend />
    </div>
  )
}
