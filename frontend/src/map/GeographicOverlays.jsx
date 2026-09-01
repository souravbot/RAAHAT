// GeographicOverlays — Optional physical geography layers (Rivers, Terrain,
// Flood Inundation Zones, Landslide Hazard Zones).
// Renders below routes and nodes so operational intelligence remains visually primary.

import { TileLayer, Polygon, Polyline, Tooltip } from 'react-leaflet'
import { useTwinStore } from '../state/useTwinStore'

// Geographic coordinates for the Brahmaputra River channel in the corridor
const BRAHMAPUTRA_CHANNEL = [
  [26.22, 91.55],
  [26.20, 91.62],
  [26.18, 91.71],
  [26.17, 91.77],
  [26.15, 91.83],
  [26.13, 91.92],
  [26.11, 92.02],
  [26.10, 92.12],
  [26.12, 92.14],
  [26.14, 92.04],
  [26.16, 91.94],
  [26.18, 91.85],
  [26.20, 91.78],
  [26.21, 91.71],
  [26.23, 91.63],
  [26.24, 91.55],
]

// Tributary river channel passing directly beneath Bridge B001 & B002
const SOUTHERN_RIVER_TRIBUTARY = [
  [26.18, 91.72],
  [26.14, 91.72],
  [26.10, 91.73],
  [26.06, 91.72], // Intersects Bridge B001 (Far Bank River Bridge)
  [26.04, 91.70],
  [26.02, 91.68], // Intersects Bridge B002 (Deep Gorge Bridge)
  [25.98, 91.67],
  [25.94, 91.65],
]

// Flood inundation hazard polygon (Low-lying riverbank plains)
const FLOOD_INUNDATION_ZONE = [
  [26.22, 91.58],
  [26.20, 91.68],
  [26.17, 91.78],
  [26.13, 91.88],
  [26.09, 91.98],
  [26.07, 91.80],
  [26.05, 91.71],
  [26.07, 91.68],
  [26.12, 91.67],
  [26.16, 91.58],
]

// Landslide hazard polygon (Highland mountainous slopes around J002, J007, B002, V008)
const LANDSLIDE_HAZARD_ZONE = [
  [26.15, 91.62],
  [26.13, 91.68],
  [26.07, 91.67],
  [26.01, 91.65],
  [25.92, 91.62],
  [25.91, 91.68],
  [25.97, 91.71],
  [26.05, 91.74],
  [26.11, 91.71],
  [26.16, 91.65],
]

export default function GeographicOverlays() {
  const mapLayers = useTwinStore((s) => s.mapLayers)

  return (
    <>
      {/* ── Terrain / Elevation Hillshade Layer ── */}
      {mapLayers.terrain && (
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"
          opacity={0.38}
          maxZoom={16}
        />
      )}

      {/* ── Rivers & Water Bodies Layer ── */}
      {mapLayers.waterBodies && (
        <>
          {/* Main Brahmaputra River Basin */}
          <Polygon
            positions={BRAHMAPUTRA_CHANNEL}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#38bdf8',
              fillOpacity: 0.32,
              weight: 1.5,
              className: 'geo-water-polygon',
            }}
          >
            <Tooltip direction="center" opacity={0.94} className="raahat-map-tooltip">
              <div className="tooltip-node-header">
                <span className="tooltip-node-badge" style={{ background: '#0284c7' }}>WATERWAY</span>
              </div>
              <div className="tooltip-node-title">Brahmaputra River Basin</div>
              <div className="tooltip-node-line">Major physical barrier &amp; transport corridor</div>
            </Tooltip>
          </Polygon>

          {/* Southern River Crossing Tributary */}
          <Polyline
            positions={SOUTHERN_RIVER_TRIBUTARY}
            pathOptions={{
              color: '#0284c7',
              weight: 5,
              opacity: 0.65,
              className: 'geo-river-tributary',
            }}
          >
            <Tooltip direction="center" opacity={0.94} className="raahat-map-tooltip">
              <div className="tooltip-node-header">
                <span className="tooltip-node-badge" style={{ background: '#0284c7' }}>RIVER TRIBUTARY</span>
              </div>
              <div className="tooltip-node-title">South Valley River Channel</div>
              <div className="tooltip-node-line">Crossed by Bridge B001 &amp; Bridge B002</div>
            </Tooltip>
          </Polyline>
        </>
      )}

      {/* ── Flood Inundation Zones (Hazards) ── */}
      {mapLayers.floodZones && (
        <Polygon
          positions={FLOOD_INUNDATION_ZONE}
          pathOptions={{
            color: '#0369a1',
            fillColor: '#0284c7',
            fillOpacity: 0.18,
            weight: 1.5,
            dashArray: '5, 5',
            className: 'geo-flood-zone',
          }}
        >
          <Tooltip direction="center" opacity={0.94} className="raahat-map-tooltip">
            <div className="tooltip-hazard-header">
              <span className="hazard-alert-tag" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.3)' }}>
                FLOOD HAZARD ZONE
              </span>
            </div>
            <div className="tooltip-node-title">Riverbank Flood Inundation Plain</div>
            <div className="tooltip-node-line">High seasonal vulnerability · Bridge B001 corridor</div>
          </Tooltip>
        </Polygon>
      )}

      {/* ── Mountain Landslide Risk Zones (Hazards) ── */}
      {mapLayers.landslideRisk && (
        <Polygon
          positions={LANDSLIDE_HAZARD_ZONE}
          pathOptions={{
            color: '#d97706',
            fillColor: '#f59e0b',
            fillOpacity: 0.18,
            weight: 1.5,
            dashArray: '5, 5',
            className: 'geo-landslide-zone',
          }}
        >
          <Tooltip direction="center" opacity={0.94} className="raahat-map-tooltip">
            <div className="tooltip-hazard-header">
              <span className="hazard-alert-tag" style={{ background: 'rgba(232, 135, 30, 0.15)', color: '#9A5500', borderColor: 'rgba(232, 135, 30, 0.3)' }}>
                LANDSLIDE HAZARD ZONE
              </span>
            </div>
            <div className="tooltip-node-title">Highland Mountain Slope Zone</div>
            <div className="tooltip-node-line">Steep gradient · High slope instability during monsoons</div>
          </Tooltip>
        </Polygon>
      )}
    </>
  )
}
