import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { fetchLocations } from './api/mock'
import './App.css'

// Fix default marker icon paths (react-leaflet + bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const KIND_LABEL = {
  warehouse: '🏬 Warehouse',
  hospital: '🏥 Hospital',
  market: '🛒 Market',
  village: '🏘️ Village',
  agricultural_centre: '🌾 Agricultural Centre',
}

export default function App() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLocations()
      .then((data) => setLocations(data.locations ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>RAAHAT</h1>
        <span className="subtitle">Regional AI for Accessibility, Assistance &amp; Transport</span>
        <span className={`api-status ${error ? 'error' : loading ? 'loading' : 'ok'}`}>
          {error ? `API error: ${error}` : loading ? 'Loading locations…' : `Loaded ${locations.length} locations`}
        </span>
      </header>

      <div className="map-wrap">
        <MapContainer
          center={[26.14, 92.0]}
          zoom={6}
          className="map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lon]}>
              <Popup>
                <strong>{loc.name}</strong>
                <br />
                {KIND_LABEL[loc.kind] ?? loc.kind}
                <br />
                <em>Status: {loc.status}</em>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
