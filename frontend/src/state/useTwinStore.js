// Global store for the RAAHAT frontend.
// Holds the live Regional Twin snapshot + UI selection state.

import { create } from 'zustand'
import { fetchTwin } from '../api/twin'

export const useTwinStore = create((set, get) => ({
  // ---- twin state ----
  metadata: null,
  nodes: [],
  edges: [],
  summary: null,
  loading: true,
  error: null,

  // ---- selection ----
  selectedNodeId: null,
  selectedEdgeId: null,

  // map instance ref (set by MapView) for programmatic focus
  mapRef: null,

  // ---- actions ----
  loadTwin: async () => {
    set({ loading: true, error: null })
    try {
      const twin = await fetchTwin()
      set({
        metadata: twin.metadata,
        nodes: twin.nodes,
        edges: twin.edges,
        summary: twin.summary,
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  setMapRef: (map) => set({ mapRef: map }),

  selectNode: (nodeId) =>
    set({ selectedNodeId: nodeId, selectedEdgeId: null }),

  selectEdge: (edgeId) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedEdgeId: null }),

  // Focus the map on a node's coordinate.
  focusNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    const map = get().mapRef
    if (node && map) {
      map.flyTo([node.lat, node.lng], Math.max(map.getZoom(), 9))
      set({ selectedNodeId: nodeId, selectedEdgeId: null })
    }
  },

  nodesById: () => {
    const map = new Map()
    for (const n of get().nodes) map.set(n.id, n)
    return map
  },
}))
