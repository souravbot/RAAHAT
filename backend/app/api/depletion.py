"""Depletion API endpoints for RAAHAT."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Path
from typing import List, Optional

from app.services.inventory_service import InventoryService
from app.services.regional_state_service import get_regional_state_service

router = APIRouter(prefix="/depletion", tags=["depletion"])


@router.get("", response_model=dict)
def get_all_depletion() -> dict:
    """Return depletion intelligence for all inventory facilities."""
    state_service = get_regional_state_service()
    state = state_service.state
    
    service = InventoryService(get_regional_state_service())
    facilities = service.calculate_all_supply_intelligence(state)
    summary = service.calculate_regional_summary(facilities)
    
    return {
        "regional_state_version": state.metadata.version,
        "calculated_at": datetime.utcnow().isoformat() + "Z",
        "alerts": [f.model_dump() for f in facilities],
        "summary": summary.model_dump()
    }


@router.get("/{node_id}", response_model=dict)
def get_facility_depletion(
    node_id: str = Path(..., description="ID of the facility (hospital/warehouse)"),
) -> dict:
    """Return detailed depletion intelligence for a specific facility."""
    state_service = get_regional_state_service()
    state = state_service.state
    
    node = state.node_map().get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} does not exist")
    
    if node.type not in ["HOSPITAL", "WAREHOUSE"]:
        raise HTTPException(status_code=404, detail=f"Node {node_id} is not an inventory facility")
    
    service = InventoryService(get_regional_state_service())
    facility_info = service._calculate_facility_supply(state.node_map()[node_id], node_id, state)
    
    if not facility_info:
        raise HTTPException(status_code=404, detail=f"No inventory data for {node_id}")
    
    return {
        "facility": facility_info.model_dump(),
        "calculated_at": datetime.utcnow().isoformat() + "Z",
        "regional_state_version": state.metadata.version
    }


@router.get("/summary/regional", response_model=dict)
def get_regional_summary() -> dict:
    """Return regional supply summary."""
    state_service = get_regional_state_service()
    state = state_service.state
    
    service = InventoryService(get_regional_state_service())
    facilities = service.calculate_all_supply_intelligence(state)
    summary = service.calculate_regional_summary(facilities)
    
    return {
        "regional_state_version": state.metadata.version,
        "calculated_at": datetime.utcnow().isoformat() + "Z",
        "summary": summary.model_dump()
    }