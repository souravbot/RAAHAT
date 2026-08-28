import { useEffect } from 'react'
import { useTwinStore } from './state/useTwinStore'
import MapView from './map/MapView'
import Sidebar from './panels/Sidebar'
import NodeDetailPanel from './panels/NodeDetailPanel'
import EdgeDetailPanel from './panels/EdgeDetailPanel'
import './App.css'

export default function App() {
  const loadTwin = useTwinStore((s) => s.loadTwin)
  const loading = useTwinStore((s) => s.loading)
  const error = useTwinStore((s) => s.error)
  const metadata = useTwinStore((s) => s.metadata)
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const summary = useTwinStore((s) => s.summary)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)

  useEffect(() => {
    loadTwin()
  }, [loadTwin])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>RAAHAT</h1>
          <span className="subtitle">Regional AI for Accessibility, Assistance &amp; Transport</span>
        </div>
        <div
          className={`api-status ${error ? 'error' : loading ? 'loading' : 'ok'}`}
          title={error || undefined}
        >
          {error
            ? 'Offline'
            : loading
              ? 'Loading twin…'
              : `Twin v${metadata?.version} · ${summary?.total_nodes ?? nodes.length} nodes / ${summary?.total_edges ?? edges.length} routes`}
        </div>
      </header>

      {error ? (
        <div className="error-screen">
          <h2>Unable to load the Regional Twin</h2>
          <p>{error}</p>
          <p className="error-hint">
            Start the RAAHAT backend (<code>uvicorn app.main:app --port 8000</code>) and refresh.
          </p>
        </div>
      ) : (
        <div className="app-body">
          <Sidebar />
          <MapView />
          {(selectedNode || selectedEdge) && (
            <div className="detail-slot">
              {selectedNode && <NodeDetailPanel node={selectedNode} />}
              {selectedEdge && <EdgeDetailPanel edge={selectedEdge} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
