// Global store for the RAAHAT frontend.
// Holds the live Regional Twin snapshot + UI selection state.

import { create } from 'zustand'
import { fetchTwin } from '../api/twin'
import { applyDisruption, runSimulation, resetDemo } from '../api/disruptionApi'

export const useTwinStore = create((set, get) => ({
  // ---- twin state ----
  metadata: null,
  nodes: [],
  edges: [],
  summary: null,
  loading: true,
  error: null,

  // ---- village accessibility intelligence ----
  villageAccessibility: [],

  // ---- selection ----
  selectedNodeId: null,
  selectedEdgeId: null,

  // map instance ref (set by MapView) for programmatic focus
  mapRef: null,

  // ---- disruption / simulation UI state ----
  disruptionBusy: false,
  disruptionError: null,
  simResult: null,

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
        villageAccessibility: twin.village_accessibility || [],
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  refreshTwin: async () => {
    try {
      const twin = await fetchTwin()
      set({
        metadata: twin.metadata,
        nodes: twin.nodes,
        edges: twin.edges,
        summary: twin.summary,
        villageAccessibility: twin.village_accessibility || [],
      })
      return twin
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  // Applies a LIVE disruption, then refreshes the twin so the map updates.
  applyLiveDisruption: async (payload) => {
    set({ disruptionBusy: true, disruptionError: null })
    try {
      const result = await applyDisruption(payload)
      await get().refreshTwin()
      set({ disruptionBusy: false })
      return result
    } catch (err) {
      set({ disruptionBusy: false, disruptionError: err.message })
      throw err
    }
  },

  // Runs a hypothetical simulation without touching live state.
  runSimulationNow: async (payload) => {
    set({ disruptionBusy: true, disruptionError: null })
    try {
      const result = await runSimulation(payload)
      set({ disruptionBusy: false, simResult: result })
      return result
    } catch (err) {
      set({ disruptionBusy: false, disruptionError: err.message })
      throw err
    }
  },

  resetDemo: async () => {
    set({ disruptionBusy: true, disruptionError: null })
    try {
      await resetDemo()
      await get().refreshTwin()
      set({ disruptionBusy: false, simResult: null, selectedNodeId: null, selectedEdgeId: null })
      return true
    } catch (err) {
      set({ disruptionBusy: false, disruptionError: err.message })
      throw err
    }
  },

  clearDisruptionError: () => set({ disruptionError: null }),
  clearSimResult: () => set({ simResult: null }),

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

  // Get accessibility data for a specific village
  getVillageAccessibility: (villageId) => {
    return get().villageAccessibility.find(v => v.village_id === villageId)
  },
}))
