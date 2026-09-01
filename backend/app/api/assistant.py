"""Natural Language Assistant API — Phase 10.

POST /ask — Conversational interface to RAHAAT intelligence.
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict, Optional
from pydantic import BaseModel

from app.services.llm_service import get_llm_service

router = APIRouter(prefix="/ask", tags=["assistant"])


class AskRequest(BaseModel):
    """Request payload for the natural language assistant."""
    question: str
    scenario_id: Optional[str] = None


class AskResponse(BaseModel):
    """Structured response from the natural language assistant."""
    answer: str
    type: str
    sources_used: list[str]
    data: Dict[str, Any]
    scenario: Dict[str, Any]
    reasoning: list[str]


@router.post("", response_model=AskResponse)
async def ask_question(request: AskRequest) -> AskResponse:
    """
    Process a natural language question using the RAHAAT intelligence assistant.
    
    The assistant uses an LLM with function calling to determine which backend
    tools are needed, executes them, and explains the results in natural language.
    
    The LLM never fabricates operational data - it only explains actual
    backend results.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    llm = await get_llm_service()
    result = await llm.ask(request.question.strip(), request.scenario_id)
    
    return AskResponse(**result)


@router.get("/info")
async def get_assistant_info() -> Dict[str, Any]:
    """Return information about the assistant's capabilities."""
    return {
        "name": "RAHAAT Intelligence Assistant",
        "description": "Natural language interface to RAHAAT regional intelligence",
        "capabilities": [
            "Regional twin status",
            "Priority areas and resource shortages",
            "Supply depletion monitoring",
            "Cascading impact analysis",
            "Action plan recommendations",
            "What-if scenario simulation",
            "Scenario comparison"
        ],
        "example_questions": [
            "Which area needs attention first?",
            "Show me current supply shortages",
            "What is the impact of closing edge E001?",
            "Recommend the best response for H001 medicine shortage",
            "What happens if edge E005 is closed?",
            "Compare closure vs risk increase for E001"
        ],
        "note": "All answers are derived from live RAHAAT backend engines. The assistant never fabricates operational data."
    }


# Global instance
_llm_service = None


async def get_llm_service() -> "LLMService":
    global _llm_service
    if _llm_service is None:
        from app.services.llm_service import LLMService
        _llm_service = LLMService()
    return _llm_service