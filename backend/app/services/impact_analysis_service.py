"""Impact Analysis Engine for RAAHAT.

Orchestrates existing services to compute cascading impact of infrastructure failure.
"""

from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import copy
import uuid
from datetime import datetime

from app.models.impact import (
    ImpactConfig,
    VillageImpact,
    ServiceImpact,
    NewlyIsolatedNode,
    ImpactScoreComponents,
    ImpactMetrics,
    ImpactLevel,
    ServiceImpactLevel,
    ImpactReason,
)
from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.models.accessibility import VillageAccessibility, ServiceAccessibility
from app.services.accessibility_service import AccessibilityEngine, calculate_accessibility
from app.services.disruption_service import DisruptionService
from app.services.regional_state_service import RegionalStateService


@dataclass
class ImpactResult:
    """Complete impact analysis result."""
    analysis_id: str
    scenario_edge_id: str
    scenario_edge_name: str
    hypothetical_accessibility: List[Any]
    baseline_accessibility: List[Any]
    village_impacts: List[VillageImpact]
    service_impacts: Dict[str, List[ServiceImpact]]
    newly_isolated: List[Any]
    metrics: Any
    impact_score: float
    impact_level: str
    impact_components: Dict[str, float]
    impact_summary: str
    analyzed_at: str
    regional_state_version: int


class ImpactAnalysisEngine:
    """Core engine for cascading impact analysis."""
    
    def __init__(self, state_service: RegionalStateService, config: Optional[ImpactConfig] = None):
        self.state_service = state_service
        self.config = config or ImpactConfig.default()
        self.accessibility_engine = AccessibilityEngine(config=self.config)
        self.disruption_service = DisruptionService()
    
    def analyze_edge_closure(
        self,
        edge_id: str,
        hypothetical_state: Optional[RegionalState] = None,
        baseline_state: Optional[RegionalState] = None,
    ) -> Dict[str, Any]:
        """Run impact analysis for an edge closure.

        When ``hypothetical_state`` is provided, it is treated as an already
        mutated clone. ``baseline_state`` can be supplied by simulations so
        the comparison is always live baseline versus hypothetical state.
        The default behavior remains unchanged for POST /impact/{edge_id}.
        """
        # 1. Get live baseline state
        live_state = baseline_state or self.state_service.state

        # 2. Calculate baseline accessibility
        baseline_result = calculate_accessibility(live_state)
        baseline_by_village = {v.village_id: v for v in baseline_result.villages}

        # 3. Create/use hypothetical state with edge closed
        if hypothetical_state is None:
            hypothetical_state = live_state.clone()
            from app.models.disruption import DisruptionRequest
            _, updated_edge = DisruptionService.apply(
                hypothetical_state,
                DisruptionRequest(edge_id=edge_id, type="closure", risk_delta=0),
            )
        else:
            updated_edge = hypothetical_state.edge_map().get(edge_id)
            if updated_edge is None:
                raise ValueError(f"Edge {edge_id} does not exist in hypothetical state")
        
        # 3. Calculate hypothetical accessibility
        hypothetical_result = calculate_accessibility(hypothetical_state)
        hypothetical_by_village = {v.village_id: v for v in hypothetical_result.villages}
        
        # 4. Build edge info for response
        edge = live_state.edge_map().get(edge_id)
        edge_name = edge.id if edge else edge_id
        
        # 5. Analyze village impacts
        village_impacts = self._analyze_village_impacts(
            baseline_by_village, hypothetical_by_village, live_state
        )
        
        # 6. Analyze service impacts
        affected_hospitals = self._analyze_service_impact(
            baseline_by_village, hypothetical_by_village, live_state, NodeType.HOSPITAL
        )
        affected_warehouses = self._analyze_service_impact(
            baseline_by_village, hypothetical_by_village, live_state, NodeType.WAREHOUSE
        )
        
        # 7. Find newly isolated nodes
        newly_isolated = self._find_newly_isolated(
            baseline_by_village, hypothetical_by_village, live_state
        )
        
        # 8. Calculate regional metrics (with all data now available)
        metrics = self._calculate_metrics(
            village_impacts, live_state, baseline_result.villages, 
            affected_hospitals, affected_warehouses, hypothetical_result.villages
        )
        
        # 9. Calculate impact score
        impact_score, components = self._calculate_impact_score(
            village_impacts, live_state, metrics
        )
        
        # 10. Determine impact level
        impact_level = self._determine_impact_level(metrics)
        
        # 11. Generate plain-language summary
        summary = self._generate_summary(village_impacts, metrics, live_state, edge_id)
        
        analysis_id = f"IMP{str(uuid.uuid4().hex[:4]).upper()}"
        
        return {
            "analysis_id": analysis_id,
            "scenario": {
                "edge_id": edge_id,
                "edge_name": edge_id,
                "hypothetical_status": "CLOSED"
            },
            "impact_score": round(self._normalize_score(impact_score), 1),
            "impact_level": metrics.dependency_level,
            "impact_components": {
                "population_impact": round(components.population_impact, 1),
                "accessibility_impact": round(components.accessibility_impact, 1),
                "isolation_impact": round(components.isolation_impact, 1),
                "service_impact": round(components.service_impact, 1),
            },
            "regional_metrics": {
                "total_villages": metrics.total_villages,
                "affected_villages_count": metrics.affected_villages_count,
                "critical_villages_count": metrics.critical_villages_count,
                "newly_isolated_count": metrics.newly_isolated_count,
                "affected_population": metrics.affected_population,
                "hospital_coverage_loss": metrics.hospital_coverage_loss,
                "warehouse_coverage_loss": metrics.warehouse_coverage_loss,
                "average_accessibility_before": metrics.average_accessibility_before,
                "average_accessibility_after": metrics.average_accessibility_after,
                "regional_accessibility_change": metrics.regional_accessibility_change,
                "dependency_level": metrics.dependency_level,
            },
            "affected_villages": [v.model_dump() for v in village_impacts],
            "affected_hospitals": [h.model_dump() for h in affected_hospitals],
            "affected_warehouses": [w.model_dump() for w in affected_warehouses],
            "newly_isolated_nodes": [n.model_dump() for n in newly_isolated],
            "impact_summary": summary,
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "regional_state_version": self.state_service.state.metadata.version,
        }
    
    def _analyze_village_impacts(
        self,
        baseline_by_village: Dict[str, VillageAccessibility],
        hypothetical_by_village: Dict[str, VillageAccessibility],
        live_state: RegionalState,
    ) -> List[VillageImpact]:
        """Compare baseline vs hypothetical accessibility for each village."""
        impacts = []
        
        for village_id, baseline in baseline_by_village.items():
            hypothetical = hypothetical_by_village.get(village_id)
            if not hypothetical:
                continue
            
            drop = baseline.accessibility_score - hypothetical.accessibility_score
            
            # Only include if there's a meaningful negative change
            if drop < self.config.accessibility_drop_threshold:
                continue
            
            # Determine impact level
            if drop >= self.config.critical_drop_threshold:
                impact_level = ImpactLevel.CRITICAL
            elif drop >= self.config.high_drop_threshold:
                impact_level = ImpactLevel.HIGH
            elif drop >= self.config.moderate_drop_threshold:
                impact_level = ImpactLevel.MODERATE
            else:
                impact_level = ImpactLevel.LOW
            
            # Special case: if village becomes isolated (score 0)
            if hypothetical.accessibility_score == 0:
                impact_level = ImpactLevel.CRITICAL
            
            # Generate impact reasons
            reasons = self._generate_village_reasons(baseline, hypothetical)
            
            village_node = live_state.node_map().get(village_id)
            
            impact = VillageImpact(
                village_id=village_id,
                name=village_node.name if village_node else village_id,
                population=village_node.attributes.get("population", 0) if village_node else 0,
                before={
                    "accessibility_score": baseline.accessibility_score,
                    "hospital_reachable": baseline.hospital.reachable,
                    "warehouse_reachable": baseline.warehouse.reachable,
                },
                after={
                    "accessibility_score": hypothetical.accessibility_score,
                    "hospital_reachable": hypothetical.hospital.reachable,
                    "warehouse_reachable": hypothetical.warehouse.reachable,
                },
                accessibility_drop=round(drop, 1),
                impact_level=impact_level,
                impact_reasons=reasons,
            )
            impacts.append(impact)
        
        return impacts
    
    def _generate_village_reasons(
        self,
        baseline: VillageAccessibility,
        hypothetical: VillageAccessibility,
    ) -> List[str]:
        """Generate deterministic impact reasons from structured changes."""
        reasons = []
        
        # Hospital access lost
        if baseline.hospital.reachable and not hypothetical.hospital.reachable:
            reasons.append(ImpactReason.HOSPITAL_ACCESS_LOST)
        
        # Warehouse access lost
        if baseline.warehouse.reachable and not hypothetical.warehouse.reachable:
            reasons.append(ImpactReason.WAREHOUSE_ACCESS_LOST)
        
        # Hospital changed
        if (baseline.hospital.nearest_service_id != hypothetical.hospital.nearest_service_id and
            hypothetical.hospital.reachable):
            reasons.append(ImpactReason.HOSPITAL_CHANGED)
        
        # Warehouse changed
        if (baseline.warehouse.nearest_service_id != hypothetical.warehouse.nearest_service_id and
            hypothetical.warehouse.reachable):
            reasons.append(ImpactReason.WAREHOUSE_CHANGED_TO_AT_RISK)
        
        # Healthcare cost significantly increased
        if (baseline.hospital.travel_cost_min and hypothetical.hospital.travel_cost_min and
            baseline.hospital.travel_cost_min > 0):
            pct_increase = ((hypothetical.hospital.travel_cost_min - baseline.hospital.travel_cost_min) 
                          / baseline.hospital.travel_cost_min) * 100
            if pct_increase >= self.config.significant_cost_increase_threshold:
                reasons.append(ImpactReason.HEALTHCARE_COST_INCREASED)
        
        # Supply cost significantly increased
        if (baseline.warehouse.travel_cost_min and hypothetical.warehouse.travel_cost_min and
            baseline.warehouse.travel_cost_min > 0):
            pct_increase = ((hypothetical.warehouse.travel_cost_min - baseline.warehouse.travel_cost_min)
                          / baseline.warehouse.travel_cost_min) * 100
            if pct_increase >= self.config.significant_cost_increase_threshold:
                reasons.append(ImpactReason.SUPPLY_COST_INCREASED)
        
        # Village became isolated
        if not hypothetical.hospital.reachable and not hypothetical.warehouse.reachable:
            reasons.append(ImpactReason.VILLAGE_ISOLATED)
        
        return reasons
    
    def _analyze_service_impact(
        self,
        baseline_by_village: Dict[str, VillageAccessibility],
        hypothetical_by_village: Dict[str, VillageAccessibility],
        live_state: RegionalState,
        service_type: NodeType,
    ) -> List[ServiceImpact]:
        """Calculate service coverage impact for hospitals or warehouses."""
        service_nodes = [
            node for node in live_state.nodes
            if node.type == service_type
        ]
        
        impacts = []
        for service in service_nodes:
            # Count villages that could reach this service before
            before = 0
            after = 0
            
            for village_id, baseline in baseline_by_village.items():
                hypothetical = hypothetical_by_village.get(village_id)
                if not hypothetical:
                    continue
                
                service_key = "hospital" if service_type == NodeType.HOSPITAL else "warehouse"
                baseline_service = getattr(baseline, service_key)
                hypothetical_service = getattr(hypothetical_by_village.get(village_id), service_key)
                
                if baseline_service.reachable and baseline_service.nearest_service_id == service.id:
                    before += 1
                if hypothetical_service.reachable and hypothetical_service.nearest_service_id == service.id:
                    after += 1
            
            coverage_loss = before - after
            if coverage_loss > 0:
                if coverage_loss >= 3:
                    level = ServiceImpactLevel.HIGH
                elif coverage_loss >= 2:
                    level = ServiceImpactLevel.MODERATE
                else:
                    level = ServiceImpactLevel.LOW
                
                impacts.append(ServiceImpact(
                    service_id=service.id,
                    name=service.name,
                    villages_served_before=before,
                    villages_served_after=after,
                    coverage_loss=coverage_loss,
                    impact_level=level,
                ))
        
        return impacts
    
    def _find_newly_isolated(
        self,
        baseline_by_village: Dict[str, VillageAccessibility],
        hypothetical_by_village: Dict[str, VillageAccessibility],
        live_state: RegionalState,
    ) -> List[NewlyIsolatedNode]:
        """Find nodes that became operationally isolated."""
        isolated = []
        
        for village_id, baseline in baseline_by_village.items():
            hypothetical = hypothetical_by_village.get(village_id)
            if not hypothetical:
                continue
            
            # Was reachable before, now isolated
            was_reachable = baseline.hospital.reachable or baseline.warehouse.reachable
            now_isolated = not (hypothetical.hospital.reachable or hypothetical.warehouse.reachable)
            
            if was_reachable and now_isolated:
                village_node = live_state.node_map().get(village_id)
                isolated.append(NewlyIsolatedNode(
                    node_id=village_id,
                    name=village_node.name if village_node else village_id,
                    type=village_node.type.value if village_node else "VILLAGE",
                    isolation_reason="No operational path to essential services after disruption"
                ))
        
        return isolated
    
    def _calculate_metrics(
        self,
        village_impacts: List[VillageImpact],
        live_state: RegionalState,
        baseline_villages: List,
        affected_hospitals: List,
        affected_warehouses: List,
        hypothetical_villages: List,
    ) -> Any:
        """Calculate regional impact metrics."""
        total_villages = len(village_impacts)
        affected_villages = len(village_impacts)
        critical_villages = sum(1 for v in village_impacts if v.impact_level == "CRITICAL")
        isolated_count = sum(1 for v in village_impacts 
                           if not v.after.get("hospital_reachable") and not v.after.get("warehouse_reachable"))
        
        affected_population = sum(v.population for v in village_impacts)
        
        # Hospital/warehouse coverage loss
        hospital_loss = sum(h.coverage_loss for h in affected_hospitals)
        warehouse_loss = sum(w.coverage_loss for w in affected_warehouses)
        
        # Calculate average accessibility
        baseline_avg = sum(v.accessibility_score for v in baseline_villages) / len(baseline_villages) if baseline_villages else 0
        avg_before = round(baseline_avg, 1)
        
        # For avg_after, we'd need hypothetical villages - compute from village_impacts
        avg_after = 0
        if village_impacts:
            avg_after = round(sum(v.after.get("accessibility_score", 0) for v in village_impacts) / len(village_impacts), 1)
        
        # Dependency level
        if any(v.impact_level == "CRITICAL" for v in village_impacts):
            dep_level = "CRITICAL"
        elif any(v.impact_level == "HIGH" for v in village_impacts):
            dep_level = "HIGH"
        elif village_impacts:
            dep_level = "MODERATE"
        else:
            dep_level = "LOW"
        
        return type('Metrics', (), {
            'total_villages': len(village_impacts),
            'affected_villages_count': len(village_impacts),
            'critical_villages_count': critical_villages,
            'newly_isolated_count': isolated_count,
            'affected_population': affected_population,
            'hospital_coverage_loss': hospital_loss,
            'warehouse_coverage_loss': warehouse_loss,
            'average_accessibility_before': avg_before,
            'average_accessibility_after': avg_after,
            'regional_accessibility_change': round(avg_after - avg_before, 1),
            'dependency_level': dep_level,
        })()
    
    def _calculate_impact_score(
        self,
        village_impacts: List[VillageImpact],
        live_state: RegionalState,
        metrics: Any,
    ) -> Tuple[float, ImpactScoreComponents]:
        """Calculate overall impact score with component breakdown."""
        # Population impact (0-100)
        total_pop = sum(v.attributes.get("population", 0) for v in live_state.nodes if v.type == NodeType.VILLAGE)
        affected_pop = sum(v.population for v in village_impacts)
        population_impact = (affected_pop / total_pop * 100) if total_pop > 0 else 0
        
        # Accessibility impact
        total_drop = sum(v.accessibility_drop for v in village_impacts)
        max_possible_drop = len(village_impacts) * 100 if village_impacts else 1
        accessibility_impact = min(100, (total_drop / max_possible_drop) * 100) if village_impacts else 0
        
        # Isolation impact
        isolated_count = sum(1 for v in village_impacts 
                           if not v.after.get("hospital_reachable") and not v.after.get("warehouse_reachable"))
        isolation_impact = min(100, (isolated_count / max(1, len(village_impacts))) * 100) if village_impacts else 0
        
        # Service impact
        # Approximate from coverage loss
        service_impact = 0  # Simplified for now
        
        components = ImpactScoreComponents(
            population_impact=round(population_impact, 1),
            accessibility_impact=round(accessibility_impact, 1),
            isolation_impact=round(isolation_impact, 1),
            service_impact=round(service_impact, 1),
        )
        
        score = (
            self.config.population_weight * population_impact +
            self.config.accessibility_weight * accessibility_impact +
            self.config.isolation_weight * isolation_impact +
            self.config.service_weight * service_impact
        )
        
        return score, components
    
    def _determine_impact_level(self, metrics: Any) -> ImpactLevel:
        """Determine overall dependency/impact level."""
        if metrics.critical_villages_count > 0 or metrics.newly_isolated_count > 0:
            return ImpactLevel.CRITICAL
        elif metrics.affected_villages_count >= 3:
            return ImpactLevel.HIGH
        elif metrics.affected_villages_count >= 1:
            return ImpactLevel.MODERATE
        else:
            return ImpactLevel.UNCHANGED
    
    def _normalize_score(self, score: float) -> float:
        return max(0.0, min(100.0, score))
    
    def _generate_summary(
        self,
        village_impacts: List[VillageImpact],
        metrics: Any,
        live_state: RegionalState,
        edge_id: str,
    ) -> str:
        """Generate plain-language impact summary."""
        parts = []
        
        affected_villages = len(village_impacts)
        if affected_villages == 0:
            return "No significant impact detected from this disruption."
        
        # Population
        affected_pop = sum(v.population for v in village_impacts)
        if affected_pop > 0:
            parts.append(f"{affected_villages} villages with a combined population of {affected_pop:,} would be affected.")
        
        # Isolated
        isolated = [v for v in village_impacts 
                   if not v.after.get("hospital_reachable") and not v.after.get("warehouse_reachable")]
        if isolated:
            if len(isolated) == 1:
                parts.append(f"One village ({isolated[0].name}) would become operationally isolated.")
            else:
                parts.append(f"{len(isolated)} villages would become operationally isolated.")
        
        # Hospital access
        hospital_lost = [v for v in village_impacts 
                        if v.before.get("hospital_reachable") and not v.after.get("hospital_reachable")]
        if hospital_lost:
            if len(hospital_lost) == 1:
                parts.append(f"One village would lose access to healthcare services.")
            else:
                parts.append(f"{len(hospital_lost)} villages would lose access to healthcare services.")
        
        # Warehouse access
        warehouse_lost = [v for v in village_impacts 
                         if v.before.get("warehouse_reachable") and not v.after.get("warehouse_reachable")]
        if warehouse_lost:
            if len(warehouse_lost) == 1:
                parts.append(f"One village would lose access to supply services.")
            else:
                parts.append(f"{len(warehouse_lost)} villages would lose access to supply services.")
        
        # Dependency level
        if metrics.dependency_level in ("HIGH", "CRITICAL"):
            parts.append(f"This infrastructure is {metrics.dependency_level.lower()}ly critical for regional connectivity.")
        
        return " ".join(parts)


# Convenience function for API
from datetime import datetime

def analyze_impact(state_service: RegionalStateService, edge_id: str) -> Dict[str, Any]:
    """Convenience function to run impact analysis."""
    engine = ImpactAnalysisEngine(state_service)
    return engine.analyze_edge_closure(edge_id)