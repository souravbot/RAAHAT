// MapView — assembles the Leaflet map: CartoDB Positron basemap, optional geographic overlays
// (rivers, terrain, flood/landslide hazards), animated edges, marker clustering, and layers control.

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useTwinStore } from '../state/useTwinStore'
import NodeMarker from './NodeMarker'
import EdgeLine from './EdgeLine'
import MapLegend from './MapLegend'
import RouteOverlay from './RouteOverlay'
import MapLayersControl from './MapLayersControl'
import GeographicOverlays from './GeographicOverlays'

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
  const mapLayers = useTwinStore((s) => s.mapLayers)

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <FitBoundsLayer />
        
        {/* Geographic & Hazard Overlays (Rivers, Terrain, Flood & Landslide Zones) */}
        <GeographicOverlays />

        {/* Render animated route lines (Operational Layer) */}
        {mapLayers.transport && edges.map((edge) => (
          <EdgeLine
            key={edge.id}
            edge={edge}
            source={byId.get(edge.connects[0])}
            target={byId.get(edge.connects[1])}
            selected={selectedEdgeId === edge.id}
            onSelect={selectEdge}
          />
        ))}

        {/* Marker Clustering Group — collapses dense clusters (Operational Layer) */}
        {mapLayers.facilities && (
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
        )}

        {/* Phase 8: recommended action route overlay */}
        <RouteOverlay />
      </MapContainer>

      {/* Floating Map Layers Control Panel */}
      <MapLayersControl />

      {/* Map Legend */}
      <MapLegend />
    </div>
  )
}
