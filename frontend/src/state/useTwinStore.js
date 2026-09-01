// Global store for the RAAHAT frontend.
// Holds the live Regional Twin snapshot + UI selection state.

import { create } from 'zustand'
import { fetchTwin } from '../api/twin'
import { applyDisruption, runSimulation, resetDemo } from '../api/disruptionApi'
import { analyzeImpact } from '../api/impactApi'
import { fetchAllDepletion, fetchRegionalSupplySummary } from '../api/depletionApi'
import { fetchPriorities } from '../api/priorityApi'
import { recommendAction, confirmDispatch } from '../api/actionPlanApi'
import { runScenario, compareScenarios } from '../api/scenarioApi'
import { resetDemoScenario, runDemoScenario } from '../api/demoApi'
import { askQuestion, getAssistantInfo } from '../api/assistantApi'

export const useTwinStore = create((set, get) => ({
  // ---- twin state ----
  metadata: null,
  nodes: [],
  edges: [],
  vehicles: [],
  summary: null,
  loading: true,
  error: null,

  // ---- village accessibility intelligence ----
  villageAccessibility: [],

  // ---- supply intelligence ----
  supplyData: [],
  supplySummary: null,
  supplyBusy: false,
  supplyError: null,

  // ---- resource priority intelligence (Phase 7) ----
  priorities: [],
  prioritySummary: null,
  priorityBusy: false,
  priorityError: null,
  priorityFilter: { limit: null, facilityType: null, priorityLevel: null },

  // ---- fleet (Phase 8) ----
  vehicles: [],

  // ---- action plan / recommendation (Phase 8) ----
  actionPlan: null,
  actionBusy: false,
  actionError: null,
  actionDispatching: false,

  // ---- selection ----
  selectedNodeId: null,
  selectedEdgeId: null,

  // map instance ref (set by MapView) for programmatic focus
  mapRef: null,

  // ---- disruption / simulation UI state ----
  disruptionBusy: false,
  disruptionError: null,
  simResult: null,

  // ---- scenario analysis (Phase 9) ----
  scenarioBusy: false,
  scenarioError: null,
  scenarioResult: null,
  scenarioComparison: null,

  // ---- judge-ready demo flow ----
  demoBusy: false,
  demoError: null,
  demoResult: null,

  // ---- impact analysis UI state ----
  impactBusy: false,
  impactError: null,
  impactResult: null,

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
        vehicles: twin.vehicles || [],
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
        vehicles: twin.vehicles || [],
      })
      return twin
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  // Applies a LIVE disruption, then refreshes the twin so the map updates.
  // Phase 7: derived intelligence (priority, depletion, supply) must be
  // recalculated so it never becomes stale after a live state change.
  applyLiveDisruption: async (payload) => {
    set({ disruptionBusy: true, disruptionError: null })
    try {
      const result = await applyDisruption(payload)
      await get().refreshTwin()
      // Recalculate derived intelligence against the updated live state.
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])
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

  // Phase 9: Runs a complete what-if scenario (simulate + impact + recommendations).
  runScenarioNow: async (payload) => {
    set({ scenarioBusy: true, scenarioError: null })
    try {
      const result = await runScenario(payload)
      set({ scenarioBusy: false, scenarioResult: result })
      return result
    } catch (err) {
      set({ scenarioBusy: false, scenarioError: err.message })
      throw err
    }
  },

  // Phase 9: Compare two scenarios side-by-side.
  compareScenariosNow: async (payloadA, payloadB) => {
    set({ scenarioBusy: true, scenarioError: null })
    try {
      const result = await compareScenarios(payloadA, payloadB)
      set({ scenarioBusy: false, scenarioComparison: result })
      return result
    } catch (err) {
      set({ scenarioBusy: false, scenarioError: err.message })
      throw err
    }
  },

  clearScenarioResult: () => set({ scenarioResult: null, scenarioComparison: null }),
  clearScenarioError: () => set({ scenarioError: null }),

  runDemoNow: async () => {
    set({ demoBusy: true, demoError: null })
    try {
      const result = await runDemoScenario()
      set({ demoBusy: false, demoResult: result })
      return result
    } catch (err) {
      set({ demoBusy: false, demoError: err.message })
      throw err
    }
  },

  resetDemoFlow: async () => {
    set({ demoBusy: true, demoError: null })
    try {
      const result = await resetDemoScenario()
      set({ demoBusy: false, demoResult: null })
      await get().refreshTwin()
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])
      return result
    } catch (err) {
      set({ demoBusy: false, demoError: err.message })
      throw err
    }
  },

  resetDemo: async () => {
    set({ disruptionBusy: true, disruptionError: null })
    try {
      await resetDemo()
      await get().refreshTwin()
      // Recalculate derived intelligence after resetting to baseline.
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])
      set({
        disruptionBusy: false,
        simResult: null,
        scenarioResult: null,
        scenarioComparison: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        actionPlan: null,
        actionError: null,
      })
      return true
    } catch (err) {
      set({ disruptionBusy: false, disruptionError: err.message })
      throw err
    }
  },

  clearDisruptionError: () => set({ disruptionError: null }),
  clearSimResult: () => set({ simResult: null }),

  clearImpactResult: () => set({ impactResult: null }),
  clearImpactError: () => set({ impactError: null }),

  // Runs cascading impact analysis for a specific edge.
  runImpactAnalysis: async (edgeId) => {
    set({ impactBusy: true, impactError: null })
    try {
      const result = await analyzeImpact(edgeId)
      set({ impactBusy: false, impactResult: result })
      return result
    } catch (err) {
      set({ impactBusy: false, impactError: err.message })
      throw err
    }
  },

  // Runs supply depletion analysis for all facilities.
  loadDepletion: async () => {
    set({ supplyBusy: true, supplyError: null })
    try {
      const data = await fetchAllDepletion()
      set({
        supplyBusy: false,
        supplyData: data.alerts || [],
        supplySummary: data.summary || null,
      })
      return data
    } catch (err) {
      set({ supplyBusy: false, supplyError: err.message })
      throw err
    }
  },

  fetchRegionalSummary: async () => {
    set({ supplyBusy: true, supplyError: null })
    try {
      const data = await fetchRegionalSupplySummary()
      set({ supplyBusy: false, supplySummary: data.summary || data })
      return data
    } catch (err) {
      set({ supplyBusy: false, supplyError: err.message })
      throw err
    }
  },

  clearSupplyError: () => set({ supplyError: null }),

  // ---- Phase 8: Action Plan / Recommendation ----
  // Generates an explainable action plan for a supply shortage.
  generateActionPlan: async (payload) => {
    set({ actionBusy: true, actionError: null })
    try {
      const result = await recommendAction(payload)
      set({ actionBusy: false, actionPlan: result })
      return result
    } catch (err) {
      set({ actionBusy: false, actionError: err.message })
      throw err
    }
  },

  // Confirms dispatch: sets the vehicle to en-route, refreshes the twin.
  confirmVehicleDispatch: async (vehicleId) => {
    set({ actionDispatching: true, actionError: null })
    try {
      const result = await confirmDispatch(vehicleId)
      await get().refreshTwin()
      set({ actionDispatching: false })
      return result
    } catch (err) {
      set({ actionDispatching: false, actionError: err.message })
      throw err
    }
  },

  clearActionPlan: () => set({ actionPlan: null }),
  clearActionError: () => set({ actionError: null }),

  // Runs resource priority intelligence for the LIVE regional state.
  loadPriorities: async (filters = {}) => {
    set({ priorityBusy: true, priorityError: null })
    try {
      const data = await fetchPriorities({ ...get().priorityFilter, ...filters })
      set({
        priorityBusy: false,
        priorities: data.priorities || [],
        prioritySummary: data.summary || null,
        priorityFilter: { ...get().priorityFilter, ...filters },
      })
      return data
    } catch (err) {
      set({ priorityBusy: false, priorityError: err.message })
      throw err
    }
  },

  setPriorityFilter: (filters) => {
    set({ priorityFilter: { ...get().priorityFilter, ...filters } })
    get().loadPriorities(filters).catch(() => {})
  },

  clearPriorityError: () => set({ priorityError: null }),

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

  edgesById: () => {
    const map = new Map()
    for (const e of get().edges) map.set(e.id, e)
    return map
  },

  // Get accessibility data for a specific village
  getVillageAccessibility: (villageId) => {
    return get().villageAccessibility.find(v => v.village_id === villageId)
  },
}))
