// MapLayersControl — Compact floating panel for toggling geographic,
// operational, and hazard layers. Retains selections across views.

import { useState, useRef, useEffect } from 'react'
import { useTwinStore } from '../state/useTwinStore'

export default function MapLayersControl() {
  const [isOpen, setIsOpen] = useState(false)
  const mapLayers = useTwinStore((s) => s.mapLayers)
  const toggleMapLayer = useTwinStore((s) => s.toggleMapLayer)
  const resetMapLayers = useTwinStore((s) => s.resetMapLayers)
  const containerRef = useRef(null)

  // Count active non-default layers
  const activeGeoCount = (mapLayers.waterBodies ? 1 : 0) + (mapLayers.terrain ? 1 : 0) + (mapLayers.floodZones ? 1 : 0) + (mapLayers.landslideRisk ? 1 : 0)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="map-layers-control-wrap" ref={containerRef}>
      <button
        className={`map-layers-btn ${isOpen ? 'is-open' : ''} ${activeGeoCount > 0 ? 'has-active-layers' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Toggle Map Layers"
        aria-label="Toggle Map Layers"
      >
        <span className="material-symbols-outlined map-layers-icon">layers</span>
        <span className="map-layers-label">Layers</span>
        {activeGeoCount > 0 && (
          <span className="map-layers-badge">{activeGeoCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="map-layers-panel">
          <div className="layers-panel-header">
            <div className="layers-panel-title">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>layers</span>
              Map Layers
            </div>
            <button className="layers-panel-close" onClick={() => setIsOpen(false)} aria-label="Close layers panel">
              ✕
            </button>
          </div>

          <div className="layers-panel-content">
            {/* ── GEOGRAPHY ── */}
            <div className="layers-section">
              <div className="layers-section-heading">GEOGRAPHY</div>
              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: '#0284c7' }}>water</span>
                  <div>
                    <div className="layer-name">Rivers &amp; Water Bodies</div>
                    <div className="layer-desc">Brahmaputra channel &amp; drainage basins</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.waterBodies}
                  onChange={() => toggleMapLayer('waterBodies')}
                />
              </label>

              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: '#78716c' }}>terrain</span>
                  <div>
                    <div className="layer-name">Terrain / Elevation</div>
                    <div className="layer-desc">3D mountain relief &amp; gorge contours</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.terrain}
                  onChange={() => toggleMapLayer('terrain')}
                />
              </label>
            </div>

            {/* ── OPERATIONAL ── */}
            <div className="layers-section">
              <div className="layers-section-heading">OPERATIONAL</div>
              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: 'var(--navy-500)' }}>hub</span>
                  <div>
                    <div className="layer-name">Locations &amp; Facilities</div>
                    <div className="layer-desc">Hospitals, warehouses, villages, bridges</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.facilities}
                  onChange={() => toggleMapLayer('facilities')}
                />
              </label>

              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: 'var(--green-600)' }}>alt_route</span>
                  <div>
                    <div className="layer-name">Transport Network</div>
                    <div className="layer-desc">Connected corridors &amp; bridge links</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.transport}
                  onChange={() => toggleMapLayer('transport')}
                />
              </label>
            </div>

            {/* ── HAZARDS ── */}
            <div className="layers-section">
              <div className="layers-section-heading">HAZARD RISK ZONES</div>
              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: '#0369a1' }}>flood</span>
                  <div>
                    <div className="layer-name">Flood Inundation Zones</div>
                    <div className="layer-desc">River corridor floodplains (Bridge B001)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.floodZones}
                  onChange={() => toggleMapLayer('floodZones')}
                />
              </label>

              <label className="layer-item">
                <div className="layer-item-info">
                  <span className="material-symbols-outlined layer-icon" style={{ color: 'var(--amber-500)' }}>landslide</span>
                  <div>
                    <div className="layer-name">Landslide Risk Zones</div>
                    <div className="layer-desc">Highland pass slope vulnerabilities</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="layer-switch"
                  checked={mapLayers.landslideRisk}
                  onChange={() => toggleMapLayer('landslideRisk')}
                />
              </label>
            </div>
          </div>

          <div className="layers-panel-footer">
            <button className="btn-reset-layers" onClick={resetMapLayers}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
