// Global store for the RAAHAT frontend.
// Holds the live Regional Twin snapshot + UI selection state.

import { create } from 'zustand'
import { fetchTwin } from '../api/twin'
import { applyDisruption, runSimulation, resetDemo, fetchEvents } from '../api/disruptionApi'
import { analyzeImpact } from '../api/impactApi'
import { fetchAllDepletion, fetchRegionalSupplySummary } from '../api/depletionApi'
import { fetchPriorities } from '../api/priorityApi'
import { recommendAction, confirmDispatch } from '../api/actionPlanApi'
import { runScenario, compareScenarios } from '../api/scenarioApi'
import { resetDemoScenario, runDemoScenario } from '../api/demoApi'
import { askQuestion, getAssistantInfo } from '../api/assistantApi'

const SAVED_LAYERS_KEY = 'raahat_map_layers'

const getInitialMapLayers = () => {
  try {
    const saved = localStorage.getItem(SAVED_LAYERS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    waterBodies: false,   // Rivers & Water Bodies (Geography)
    terrain: false,       // Terrain / Elevation Hillshade (Geography)
    facilities: true,     // Locations & Facilities (Operational)
    transport: true,      // Transport Network Routes (Operational)
    floodZones: false,    // Flood Inundation Zones (Hazards)
    landslideRisk: false, // Mountain Landslide Zones (Hazards)
  }
}

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
  selectedPriorityTarget: null,

  // ---- action plan / recommendation (Phase 8) ----
  actionPlan: null,
  actionBusy: false,
  actionError: null,
  actionDispatching: false,

  // ---- active incident / disruption context ----
  activeDisruption: null,

  // ---- selection ----
  selectedNodeId: null,
  selectedEdgeId: null,

  // map instance ref (set by MapView) for programmatic focus
  mapRef: null,

  // ---- disruption / simulation UI state ----
  disruptionBusy: false,
  disruptionError: null,
  simResult: null,
  events: [],
  eventsBusy: false,

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

  // ---- Phase 14: Workflow progression state ----
  workflowStage: null, // 'disruption' | 'accessibility' | 'impact' | 'supply' | 'priority' | 'action' | 'route'
  workflowHistory: [], // Track which stages have been completed in current incident
  stageStartedAt: null, // Timestamp when current stage began

  // ---- Map Layers Context State (Persisted) ----
  mapLayers: getInitialMapLayers(),

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
    set({
      disruptionBusy: true,
      disruptionError: null,
      activeDisruption: { edge_id: payload.edge_id, type: payload.type, risk_delta: payload.risk_delta },
      selectedEdgeId: payload.edge_id,
      impactResult: null,
      actionPlan: null,
      selectedPriorityTarget: null,
    })
   get().resetWorkflowForNewIncident()
   try {
      const result = await applyDisruption(payload)
      await get().refreshTwin()
      // Recalculate derived intelligence against the updated live state.
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])
      set({
        disruptionBusy: false,
        activeDisruption: {
          edge_id: payload.edge_id,
          type: payload.type,
          risk_delta: payload.risk_delta,
          status: result.updated_edge?.status || 'CLOSED',
          updated_at: result.updated_at,
        },
      })
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

  loadEvents: async () => {
    set({ eventsBusy: true })
    try {
      const data = await fetchEvents()
      set({ events: data || [], eventsBusy: false })
      return data
    } catch {
      set({ eventsBusy: false })
    }
  },

  clearSimulationState: () => {
    set({
      simResult: null,
      scenarioResult: null,
      scenarioComparison: null,
      disruptionError: null,
      scenarioError: null,
    })
  },

  clearSimResult: () => set({ simResult: null }),
  clearScenarioResult: () => set({ scenarioResult: null, scenarioComparison: null }),
  clearScenarioError: () => set({ scenarioError: null }),

  runDemoNow: async () => {
    set({ demoBusy: true, demoError: null })
    try {
      const result = await runDemoScenario()

      // 1. Refresh real Digital Twin (map, nodes, edges, vehicles, accessibility)
      await get().refreshTwin()

      // 2. Refresh live depletion + priority intelligence from backend
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])

      // 3. Map demo orchestration response into operational store state
      const targetNodeId =
        result.selected_target?.facility_id ||
        result.selected_priority_target ||
        result.priority?.selected_priority_target ||
        null
      const disruptionEdgeId = result.disruption?.edge_id || null

      const priorityTarget = result.selected_target
        ? {
            facility_id: result.selected_target.facility_id,
            facility_name: result.selected_target.facility_name,
            resource: result.selected_target.resource,
            priority_level: result.selected_target.priority_level,
            required_quantity: result.selected_target.required_quantity,
          }
        : null

      const impactData = result.impact?.data || null
      const recommendation = result.recommendation || null
      const demoPriorities = result.priority?.data?.priorities
      const demoPrioritySummary = result.priority?.data?.summary

      set({
        demoBusy: false,
        demoResult: result,
        activeDisruption: disruptionEdgeId
          ? {
              edge_id: disruptionEdgeId,
              status: result.disruption?.status || 'CLOSED',
              type: 'closure',
              description: result.disruption?.description,
            }
          : null,
        impactResult: impactData,
        impactError: null,
        // Prefer freshly loaded live priorities; fall back to demo payload
        ...(demoPriorities?.length
          ? {
              priorities: demoPriorities,
              prioritySummary: demoPrioritySummary || get().prioritySummary,
            }
          : {}),
        selectedPriorityTarget: priorityTarget,
        actionPlan: recommendation,
        actionError: null,
        simResult: null,
        scenarioResult: null,
        scenarioComparison: null,
        selectedNodeId: targetNodeId,
        selectedEdgeId: disruptionEdgeId,
      })

      // 4. Focus map on the recommended response target
      if (targetNodeId) {
        try {
          get().focusNode(targetNodeId)
        } catch {
          // map focus is progressive enhancement
        }
      }

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
      // Refresh Digital Twin to baseline clean state
      await get().refreshTwin()
      // Reload live baseline depletion & priorities
      await Promise.allSettled([
        get().loadDepletion(),
        get().loadPriorities(),
      ])
      // Reset all stale operational / demo / simulation state
      set({
        demoBusy: false,
        demoResult: null,
        demoError: null,
        activeDisruption: null,
        selectedPriorityTarget: null,
        impactResult: null,
        actionPlan: null,
        simResult: null,
        scenarioResult: null,
        scenarioComparison: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        actionError: null,
        disruptionError: null,
        impactError: null,
        scenarioError: null,
        supplyError: null,
        priorityError: null,
      })
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
        demoResult: null,
        activeDisruption: null,
        selectedPriorityTarget: null,
        impactResult: null,
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

  // Sets the active priority target for one-click action plan generation.
  selectPriorityTarget: (target) => {
    if (!target) {
      set({ selectedPriorityTarget: null })
      return
    }
    const facId = target.facility?.id || target.facility_id || target.id
    const facName = target.facility?.name || target.facility_name || facId
    const resource = target.resource?.type || target.resource_name || target.resource || 'medicine'
    const priorityLevel = target.priority_level || 'HIGH'
    const reqQty = target.required_quantity || 200

    set({
      selectedPriorityTarget: {
        facility_id: facId,
        facility_name: facName,
        resource,
        priority_level: priorityLevel,
        required_quantity: reqQty,
        score: target.priority_score,
        rank: target.rank,
      },
      selectedNodeId: facId,
      selectedEdgeId: null,
    })
    get().focusNode(facId)
  },

  // One-click action plan generation using the active priority target.
  generateActionPlanForTarget: async (targetOverride = null) => {
    const target = targetOverride || get().selectedPriorityTarget || (get().priorities.length > 0 ? {
      facility_id: get().priorities[0].facility?.id || get().priorities[0].facility_id,
      facility_name: get().priorities[0].facility?.name || get().priorities[0].facility_name,
      resource: get().priorities[0].resource?.type || get().priorities[0].resource_name,
      priority_level: get().priorities[0].priority_level,
      required_quantity: 200,
    } : null)

    if (!target || !target.facility_id || !target.resource) {
      throw new Error('No priority target selected for action plan generation.')
    }

    set({ actionBusy: true, actionError: null })
    try {
      const payload = {
        target_node: target.facility_id,
        resource: target.resource,
        required_quantity: Number(target.required_quantity) || 200,
        priority: target.priority_level,
      }
      const result = await recommendAction(payload)
      set({
        actionBusy: false,
        actionPlan: result,
        selectedPriorityTarget: target,
        selectedNodeId: target.facility_id,
      })
      get().focusNode(target.facility_id)
      return result
    } catch (err) {
      set({ actionBusy: false, actionError: err.message })
      throw err
    }
  },

  // Resets active disruption, impact, and action plan without full digital twin reload.
  resetOperationalWorkflow: () => {
    set({
      activeDisruption: null,
      selectedPriorityTarget: null,
      impactResult: null,
      actionPlan: null,
      simResult: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      actionError: null,
      disruptionError: null,
      impactError: null,
    })
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

  // ---- Map Layers Control Actions (Persisted) ----
  toggleMapLayer: (layerKey) => {
    set((state) => {
      const updated = {
        ...state.mapLayers,
        [layerKey]: !state.mapLayers[layerKey],
      }
      try {
        localStorage.setItem(SAVED_LAYERS_KEY, JSON.stringify(updated))
      } catch {}
      return { mapLayers: updated }
    })
  },

  setMapLayer: (layerKey, value) => {
    set((state) => {
      const updated = {
        ...state.mapLayers,
        [layerKey]: value,
      }
      try {
        localStorage.setItem(SAVED_LAYERS_KEY, JSON.stringify(updated))
      } catch {}
      return { mapLayers: updated }
    })
  },

  resetMapLayers: () => {
    const defaults = {
      waterBodies: false,
      terrain: false,
      facilities: true,
      transport: true,
      floodZones: false,
      landslideRisk: false,
    }
    try {
      localStorage.setItem(SAVED_LAYERS_KEY, JSON.stringify(defaults))
    } catch {}
    set({ mapLayers: defaults })
  },

  // ---- Phase 14: Workflow progression methods ----
  advanceToStage: (stage) => {
    const currentStage = get().workflowStage
    const history = get().workflowHistory
    if (!history.includes(stage)) {
      history.push(stage)
    }
    set({ workflowStage: stage, workflowHistory: history, stageStartedAt: new Date().toISOString() })
  },

  getWorkflowProgress: () => {
    const stages = ['disruption', 'accessibility', 'impact', 'supply', 'priority', 'action', 'route']
    const completed = get().workflowHistory.filter(s => stages.includes(s)).length
    return { completed, total: stages.length, percentage: (completed / stages.length) * 100 }
  },

  // Triggered when new disruption is applied; resets workflow while preserving twin
  resetWorkflowForNewIncident: () => {
    set({
      workflowStage: 'disruption',
      workflowHistory: ['disruption'],
      stageStartedAt: new Date().toISOString(),
      impactResult: null,
      actionPlan: null,
      selectedPriorityTarget: null,
      actionError: null,
      impactError: null,
    })
  },

  // Get accessibility data for a specific village
  getVillageAccessibility: (villageId) => {
    return get().villageAccessibility.find(v => v.village_id === villageId)
  },
}))
