"""LLM Service — Natural Language Assistant with function calling for RAHAAT.

This service provides a thin orchestration layer that uses an LLM with function calling
to determine which RAHAAT backend capabilities are needed to answer user questions.
The LLM never invents operational data - it only explains results from backend tools.
"""

import json
import re
import httpx
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from app.core.config import get_settings


@dataclass
class ToolResult:
    """Result from a backend tool call."""
    tool_name: str
    success: bool
    data: Any
    error: Optional[str] = None


class RAHATToolClient:
    """HTTP client for calling RAHAAT backend tools."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def get_twin(self) -> ToolResult:
        """Get the current digital twin state."""
        try:
            resp = await self.client.get(f"{self.base_url}/twin")
            resp.raise_for_status()
            return ToolResult("get_twin", True, resp.json())
        except Exception as e:
            return ToolResult("get_twin", False, None, str(e))
    
    async def get_priority(self, limit: int = None, facility_type: str = None, priority_level: str = None) -> ToolResult:
        """Get ranked resource priorities."""
        try:
            params = {}
            if limit:
                params["limit"] = limit
            if facility_type:
                params["facility_type"] = facility_type
            if priority_level:
                params["priority_level"] = priority_level
            
            resp = await self.client.get(f"{self.base_url}/priority", params=params)
            resp.raise_for_status()
            return ToolResult("get_priority", True, resp.json())
        except Exception as e:
            return ToolResult("get_priority", False, None, str(e))
    
    async def get_depletion(self) -> ToolResult:
        """Get supply depletion intelligence."""
        try:
            resp = await self.client.get(f"{self.base_url}/depletion")
            resp.raise_for_status()
            return ToolResult("get_depletion", True, resp.json())
        except Exception as e:
            return ToolResult("get_depletion", False, None, str(e))
    
    async def get_impact(self, edge_id: str) -> ToolResult:
        """Analyze impact of closing an edge."""
        try:
            resp = await self.client.post(f"{self.base_url}/impact/{edge_id}", json={})
            resp.raise_for_status()
            return ToolResult("get_impact", True, resp.json())
        except Exception as e:
            return ToolResult("get_impact", False, None, str(e))
    
    async def recommend_action(self, target_node: str, resource: str, required_quantity: float, priority: str = None) -> ToolResult:
        """Generate an action plan for a supply shortage."""
        try:
            payload = {
                "target_node": target_node,
                "resource": resource,
                "required_quantity": required_quantity
            }
            if priority:
                payload["priority"] = priority
            
            resp = await self.client.post(f"{self.base_url}/recommend-action", json=payload)
            resp.raise_for_status()
            return ToolResult("recommend_action", True, resp.json())
        except Exception as e:
            return ToolResult("recommend_action", False, None, str(e))
    
    async def simulate_disruption(self, edge_id: str, type: str = "closure", risk_delta: int = 0) -> ToolResult:
        """Run a what-if simulation."""
        try:
            payload = {"edge_id": edge_id, "type": type, "risk_delta": risk_delta}
            resp = await self.client.post(f"{self.base_url}/simulate", json=payload)
            resp.raise_for_status()
            return ToolResult("simulate_disruption", True, resp.json())
        except Exception as e:
            return ToolResult("simulate_disruption", False, None, str(e))
    
    async def run_scenario(self, edge_id: str, type: str = "closure", risk_delta: int = 0) -> ToolResult:
        """Run full scenario (simulate + impact + recommendations)."""
        try:
            payload = {"edge_id": edge_id, "type": type, "risk_delta": risk_delta}
            resp = await self.client.post(f"{self.base_url}/scenario", json=payload)
            resp.raise_for_status()
            return ToolResult("run_scenario", True, resp.json())
        except Exception as e:
            return ToolResult("run_scenario", False, None, str(e))
    
    async def compare_scenarios(self, edge_id_a: str, type_a: str, risk_delta_a: int,
                                edge_id_b: str, type_b: str, risk_delta_b: int) -> ToolResult:
        """Compare two scenarios side-by-side."""
        try:
            payload = {
                "request_a": {"edge_id": edge_id_a, "type": type_a, "risk_delta": risk_delta_a},
                "request_b": {"edge_id": edge_id_b, "type": type_b, "risk_delta": risk_delta_b}
            }
            resp = await self.client.post(f"{self.base_url}/scenario/compare", json=payload)
            resp.raise_for_status()
            return ToolResult("compare_scenarios", True, resp.json())
        except Exception as e:
            return ToolResult("compare_scenarios", False, None, str(e))
    
    async def get_facility_priority(self, node_id: str) -> ToolResult:
        """Get priority details for a specific facility."""
        try:
            resp = await self.client.get(f"{self.base_url}/priority/{node_id}")
            resp.raise_for_status()
            return ToolResult("get_facility_priority", True, resp.json())
        except Exception as e:
            return ToolResult("get_facility_priority", False, None, str(e))


class LLMService:
    """LLM service with function calling for RAHAAT natural language queries."""
    
    SYSTEM_PROMPT = """You are the RAAHAT Regional Intelligence Assistant.

RAAHAT is a decision-support system for regional accessibility, disaster response, infrastructure intelligence, supply monitoring, and coordinated action.

You are NOT an independent source of operational data.

You must use the available backend tools whenever factual information about the region, infrastructure, disruptions, supplies, priorities, routes, vehicles, impacts, or scenarios is required.

Only use numbers, locations, risks, priorities, stock levels, travel times, capacities, routes, and operational facts returned by backend tools.

Never fabricate, estimate, assume, or invent operational data.

If the required data is unavailable from the tools, clearly say that the information is currently unavailable.

Explain recommendations using the reasons returned by the RAHAAT recommendation engine.

Do not override the backend priority engine, accessibility engine, impact engine, or recommendation engine.

When discussing a simulated scenario, clearly label it as a simulation and never present simulated information as live operational data.

Keep answers concise, actionable, and understandable for disaster-response and regional coordination users."""
    
    # Tool definitions for the LLM
    TOOLS = [
        {
            "type": "function",
            "function": {
                "name": "get_twin",
                "description": "Get the current live Regional Digital Twin state including all nodes, edges, and village accessibility data.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_priority",
                "description": "Get ranked resource priorities across all facilities. Returns facilities with their resource shortages ranked by priority score.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "description": "Maximum number of priority entries to return"},
                        "facility_type": {"type": "string", "description": "Filter by facility type (HOSPITAL/WAREHOUSE)"},
                        "priority_level": {"type": "string", "description": "Filter by priority level (CRITICAL/HIGH/MODERATE/LOW)"}
                    },
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_depletion",
                "description": "Get supply depletion intelligence for all inventory facilities. Shows current stock, consumption rates, time until depletion, and resupply status.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_impact",
                "description": "Analyze the cascading impact of closing a specific transport edge. Returns impact score, affected villages, population, and service coverage.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "edge_id": {"type": "string", "description": "ID of the transport edge to analyze"}
                    },
                    "required": ["edge_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "recommend_action",
                "description": "Generate an explainable action plan for a supply shortage. Returns warehouse, vehicle, route, steps, and reasons.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_node": {"type": "string", "description": "Target facility node ID (e.g., H001)"},
                        "resource": {"type": "string", "description": "Resource type (e.g., medicine, food, water)"},
                        "required_quantity": {"type": "number", "description": "Required quantity of the resource"},
                        "priority": {"type": "string", "description": "Priority level (CRITICAL/HIGH/MODERATE/LOW)"}
                    },
                    "required": ["target_node", "resource", "required_quantity"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "simulate_disruption",
                "description": "Create a hypothetical what-if disruption scenario. Returns simulated edge state and accessibility.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "edge_id": {"type": "string", "description": "Edge ID to disrupt"},
                        "type": {"type": "string", "description": "Disruption type: closure or risk_increase", "enum": ["closure", "risk_increase"]},
                        "risk_delta": {"type": "integer", "description": "Risk increase amount (0-100)", "default": 0}
                    },
                    "required": ["edge_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "run_scenario",
                "description": "Run complete what-if scenario: simulate + impact + recommendations. Returns full hypothetical analysis.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "edge_id": {"type": "string", "description": "Edge ID to disrupt"},
                        "type": {"type": "string", "description": "Disruption type: closure or risk_increase", "enum": ["closure", "risk_increase"]},
                        "risk_delta": {"type": "integer", "description": "Risk increase amount (0-100)", "default": 0}
                    },
                    "required": ["edge_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "compare_scenarios",
                "description": "Compare two what-if scenarios side-by-side (e.g., closure vs risk increase).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "edge_id_a": {"type": "string", "description": "Edge ID for scenario A"},
                        "type_a": {"type": "string", "description": "Disruption type for A", "enum": ["closure", "risk_increase"]},
                        "risk_delta_a": {"type": "integer", "description": "Risk increase for A", "default": 0},
                        "edge_id_b": {"type": "string", "description": "Edge ID for scenario B"},
                        "type_b": {"type": "string", "description": "Disruption type for B", "enum": ["closure", "risk_increase"]},
                        "risk_delta_b": {"type": "integer", "description": "Risk increase for B", "default": 0}
                    },
                    "required": ["edge_id_a", "type_a", "edge_id_b", "type_b"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_facility_priority",
                "description": "Get detailed priority breakdown for a specific facility.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Facility node ID"}
                    },
                    "required": ["node_id"]
                }
            }
        }
    ]
    
    def __init__(self):
        self.settings = get_settings()
        self.tool_client = RAHATToolClient(self._get_backend_url())
    
    def _get_backend_url(self) -> str:
        return f"http://{self.settings.host}:{self.settings.port}"
    
    async def _call_llm(self, messages: List[Dict], tools: List[Dict] = None) -> Dict:
        """Call the LLM API with function calling support."""
        if self.settings.llm_provider == "openai":
            return await self._call_openai(messages, tools)
        elif self.settings.llm_provider == "anthropic":
            return await self._call_anthropic(messages, tools)
        else:
            # Fallback for local/ollama
            return await self._call_ollama(messages, tools)
    
    async def _call_openai(self, messages: List[Dict], tools: List[Dict]) -> Dict:
        """Call OpenAI API with function calling."""
        if not self.settings.llm_api_key:
            raise RuntimeError("LLM API key not configured. Please set LLM_API_KEY in .env")
        
        url = "https://api.openai.com/v1/chat/completions"
        if self.settings.llm_base_url:
            url = f"{self.settings.llm_base_url}/v1/chat/completions"
        
        payload = {
            "model": self.settings.llm_model,
            "messages": messages,
            "temperature": self.settings.llm_temperature,
            "max_tokens": self.settings.llm_max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        
        headers = {
            "Authorization": f"Bearer {self.settings.llm_api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    
    async def _call_anthropic(self, messages: List[Dict], tools: List[Dict]) -> Dict:
        """Call Anthropic API with function calling."""
        url = "https://api.anthropic.com/v1/messages"
        if self.settings.llm_base_url:
            url = f"{self.settings.llm_base_url}/v1/messages"
        
        # Convert tools to Anthropic format
        tool_defs = []
        for t in tools:
            if t["type"] == "function":
                fn = t["function"]
                tool_defs.append({
                    "name": fn["name"],
                    "description": fn["description"],
                    "input_schema": fn["parameters"]
                })
        
        payload = {
            "model": self.settings.llm_model,
            "messages": messages[1:] if messages[0]["role"] == "system" else messages,
            "system": messages[0]["content"] if messages[0]["role"] == "system" else self.SYSTEM_PROMPT,
            "max_tokens": self.settings.llm_max_tokens,
            "temperature": self.settings.llm_temperature,
        }
        if tool_defs:
            payload["tools"] = tool_defs
            payload["tool_choice"] = {"type": "auto"}
        
        headers = {
            "x-api-key": self.settings.llm_api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    
    async def _call_ollama(self, messages: List[Dict], tools: List[Dict]) -> Dict:
        """Call local Ollama API."""
        url = f"{self.settings.llm_base_url or 'http://localhost:11434'}/api/chat"
        
        # Convert tools to Ollama format (simplified)
        tool_names = [t["function"]["name"] for t in tools] if tools else []
        
        payload = {
            "model": self.settings.llm_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": self.settings.llm_temperature,
                "num_predict": self.settings.llm_max_tokens
            }
        }
        if tool_names:
            payload["tools"] = tool_names
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
    
    async def _execute_tool(self, tool_name: str, arguments: Dict) -> ToolResult:
        """Execute a backend tool based on LLM function call."""
        method = getattr(self.tool_client, tool_name, None)
        if not method:
            return ToolResult(tool_name, False, None, f"Unknown tool: {tool_name}")
        return await method(**arguments)
    
    async def ask(self, question: str, scenario_id: Optional[str] = None) -> Dict:
        """
        Process a natural language question and return a structured answer.
        
        The LLM will:
        1. Understand the question
        2. Call appropriate backend tools
        3. Synthesize a natural language answer from tool results
        """
        # Check if LLM is configured
        if not self.settings.llm_api_key:
            # Fallback: use backend tools directly without LLM
            return await self._fallback_ask(question, scenario_id)
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ]
        
        # Track tool calls and results for reasoning
        tool_calls_log = []
        sources_used = []
        tool_results = {}
        
        # Allow up to 5 tool calls in a chain
        for iteration in range(5):
            response = await self._call_llm(messages, self.TOOLS)
            
            # Extract message and tool calls
            if self.settings.llm_provider == "anthropic":
                message = response.get("content", [{}])[0]
                tool_calls = [c for c in response.get("content", []) if c.get("type") == "tool_use"]
            elif self.settings.llm_provider == "openai":
                message = response.get("choices", [{}])[0].get("message", {})
                tool_calls = message.get("tool_calls", [])
            else:
                message = response.get("message", {})
                tool_calls = message.get("tool_calls", [])
            
            if tool_calls:
                # Execute tool calls
                for tc in tool_calls:
                    if self.settings.llm_provider == "anthropic":
                        tool_name = tc.get("name")
                        tool_args = tc.get("input", {})
                    elif self.settings.llm_provider == "openai":
                        tool_name = tc.get("function", {}).get("name")
                        tool_args = json.loads(tc.get("function", {}).get("arguments", "{}"))
                    else:
                        tool_name = tc.get("function", {}).get("name")
                        tool_args = json.loads(tc.get("function", {}).get("arguments", "{}"))
                    
                    result = await self._execute_tool(tool_name, tool_args)
                    tool_results[tool_name] = result
                    tool_calls_log.append({
                        "tool": tool_name,
                        "args": tool_args,
                        "success": result.success
                    })
                    if result.success:
                        sources_used.append(tool_name)
                
                # Add tool results to conversation
                if self.settings.llm_provider == "anthropic":
                    tool_results_content = []
                    for tc in tool_calls:
                        tool_name = tc.get("name")
                        result = tool_results.get(tool_name)
                        if result:
                            tool_results_content.append({
                                "type": "tool_result",
                                "tool_use_id": tc.get("id"),
                                "content": json.dumps(result.data) if result.success else f"Error: {result.error}"
                            })
                    messages.append({"role": "assistant", "content": tool_results_content})
                else:
                    messages.append(message)  # assistant message with tool_calls
                    for tc in tool_calls:
                        tool_name = tc.get("function", {}).get("name") if self.settings.llm_provider == "openai" else tc.get("name")
                        result = tool_results.get(tool_name)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.get("id"),
                            "content": json.dumps(result.data) if result and result.success else f"Error: {result.error if result else 'Unknown error'}"
                        })
            else:
                # No more tool calls, we have the final answer
                answer = message.get("content", "") if isinstance(message, dict) else str(message)
                break
        else:
            # Max iterations reached
            answer = "I've reached the maximum number of tool calls. Here's what I found so far."
        
        # Build structured response
        return {
            "answer": answer,
            "type": self._determine_answer_type(question, sources_used),
            "sources_used": sources_used,
            "data": tool_results,
            "scenario": {
                "is_simulated": scenario_id is not None,
                "scenario_id": scenario_id
            },
            "reasoning": self._build_reasoning(tool_calls_log, tool_results)
        }
    
    async def _fallback_ask(self, question: str, scenario_id: Optional[str] = None) -> Dict:
        """Fallback when LLM is not configured - use simple keyword matching to call tools."""
        q = question.lower()
        sources_used = []
        tool_results = {}
        tool_calls_log = []
        
        # Simple keyword-based tool selection
        tools_to_call = []
        
        if any(w in q for w in ['priority', 'shortage', 'need', 'attention', 'critical', 'urgent', 'first']):
            tools_to_call.append(('get_priority', {}))
        if any(w in q for w in ['supply', 'stock', 'depletion', 'shortage', 'medicine', 'food', 'water']):
            tools_to_call.append(('get_depletion', {}))
        if any(w in q for w in ['impact', 'close', 'closed', 'disruption', 'cut', 'bridge', 'road']):
            # Need edge_id - try to extract
            import re
            edge_match = re.search(r'\b(E\d+)\b', question, re.IGNORECASE)
            if edge_match:
                tools_to_call.append(('get_impact', {'edge_id': edge_match.group(1).upper()}))
        if any(w in q for w in ['recommend', 'action', 'plan', 'dispatch', 'vehicle', 'warehouse', 'route']):
            # Need target_node, resource, quantity - try to extract
            import re
            node_match = re.search(r'\b(H\d+)\b', question, re.IGNORECASE)
            resource_match = re.search(r'\b(medicine|food|water)\b', question, re.IGNORECASE)
            qty_match = re.search(r'(\d+)\s*(units?|kg|litres?)', question, re.IGNORECASE)
            if node_match and resource_match:
                qty = int(qty_match.group(1)) if qty_match else 100
                tools_to_call.append(('recommend_action', {
                    'target_node': node_match.group(1).upper(),
                    'resource': resource_match.group(1).lower(),
                    'required_quantity': qty
                }))
        # Scenario comparisons: handle both multi-edge and single-edge with different types
        if any(w in q for w in ['compare', 'versus', 'vs', 'difference']):
            import re
            edges = re.findall(r'\b(E\d+)\b', question, re.IGNORECASE)
            if len(edges) >= 2:
                tools_to_call.append(('compare_scenarios', {
                    'edge_id_a': edges[0].upper(), 'type_a': 'closure', 'risk_delta_a': 0,
                    'edge_id_b': edges[1].upper(), 'type_b': 'risk_increase', 'risk_delta_b': 50
                }))
            elif len(edges) == 1:
                # Compare closure vs risk increase on the same edge
                tools_to_call.append(('compare_scenarios', {
                    'edge_id_a': edges[0].upper(), 'type_a': 'closure', 'risk_delta_a': 0,
                    'edge_id_b': edges[0].upper(), 'type_b': 'risk_increase', 'risk_delta_b': 50
                }))
        elif any(w in q for w in ['what if', 'simulate', 'hypothetical', 'scenario']):
            edge_match = re.search(r'\b(E\d+)\b', question, re.IGNORECASE)
            if edge_match:
                tools_to_call.append(('run_scenario', {'edge_id': edge_match.group(1).upper(), 'type': 'closure', 'risk_delta': 0}))
        if not tools_to_call:
            # Default: get twin state
            tools_to_call.append(('get_twin', {}))
        
        for tool_name, args in tools_to_call:
            method = getattr(self.tool_client, tool_name, None)
            if method:
                result = await method(**args)
                tool_results[tool_name] = result
                tool_calls_log.append({"tool": tool_name, "args": args, "success": result.success})
                if result.success:
                    sources_used.append(tool_name)
        
        # Build simple answer from results
        if not sources_used:
            answer = "I couldn't find any relevant data for your question. Please try asking about priorities, supply levels, disruptions, or action plans."
        else:
            answer_parts = []
            for tool_name in sources_used:
                result = tool_results.get(tool_name)
                if not result or not result.success:
                    continue
                data = result.data
                
                if tool_name == 'get_priority' and data.get('priorities'):
                    top = data['priorities'][0]
                    answer_parts.append(f"Top priority: {top['facility']['id']} needs {top['resource']['type']} (priority score: {top['priority_score']:.1f})")
                elif tool_name == 'get_depletion' and data.get('alerts'):
                    alert = data['alerts'][0]
                    answer_parts.append(f"Supply alert: {alert['facility_name']} has {len(alert['resources'])} critical resources")
                elif tool_name == 'get_impact':
                    data = data
                    answer_parts.append(f"Impact of closing {data.get('scenario',{}).get('edge_id')}: score {data.get('impact_score')}, level {data.get('impact_level')}")
                elif tool_name == 'recommend_action' and data.get('success'):
                    data = data
                    wh = data.get('selected_warehouse', {})
                    veh = data.get('selected_vehicle', {})
                    answer_parts.append(f"Recommended: dispatch {veh.get('id')} ({veh.get('type')}) from {wh.get('id')} ({wh.get('name')})")
                elif tool_name == 'run_scenario':
                    scenario = data.get('scenario', {})
                    impact = data.get('hypothetical_impact', {})
                    answer_parts.append(f"Scenario {scenario.get('simulation_id')} is simulated only: impact score {impact.get('impact_score')}, level {impact.get('impact_level')}")
                elif tool_name == 'compare_scenarios':
                    a = data.get('scenario_a', {})
                    b = data.get('scenario_b', {})
                    ia = a.get('hypothetical_impact', {})
                    ib = b.get('hypothetical_impact', {})
                    answer_parts.append(f"Scenario A impact: {ia.get('impact_score')} ({ia.get('impact_level')}); Scenario B impact: {ib.get('impact_score')} ({ib.get('impact_level')})")
        
            answer = " ".join(answer_parts) if answer_parts else "I found some data but couldn't synthesize a clear answer."
        
        return {
            "answer": answer,
            "type": self._determine_answer_type(sources_used),
            "sources_used": sources_used,
            "data": {k: v.data if hasattr(v, 'data') else v for k, v in tool_results.items()},
            "scenario": {"is_simulated": False, "scenario_id": None},
            "reasoning": self._build_reasoning(
                [{"tool": t, "success": tool_results.get(t, {}).success if hasattr(tool_results.get(t), 'success') else False} for t in sources_used],
                {k: v for k, v in tool_results.items()}
            )
        }
    
    def _determine_answer_type(self, sources: List[str]) -> str:
        """Determine the type of answer based on sources used."""
        if "run_scenario" in sources or "simulate_disruption" in sources or "compare_scenarios" in sources:
            return "scenario_analysis"
        elif "recommend_action" in sources:
            return "action_recommendation"
        elif "get_priority" in sources or "get_depletion" in sources:
            return "situational_awareness"
        elif "get_impact" in sources:
            return "impact_analysis"
        elif "get_twin" in sources:
            return "twin_status"
        return "general"
    
    def _build_reasoning(self, tool_calls_log: List[Dict], tool_results: Dict) -> List[str]:
        """Build concise, user-facing reasoning from tool calls."""
        reasoning = []
        for log in tool_calls_log:
            tool = log["tool"]
            success = log["success"]
            if success:
                result = tool_results.get(tool, {})
                if tool == "get_priority":
                    data = result.data if hasattr(result, 'data') else result
                    if isinstance(data, dict) and "priorities" in data:
                        top = data["priorities"][0] if data["priorities"] else None
                        if top:
                            reasoning.append(f"Top priority: {top.get('facility', {}).get('id')} — {top.get('resource', {}).get('type')} (score: {top.get('priority_score')})")
                elif tool == "recommend_action":
                    data = result.data if hasattr(result, 'data') else result
                    if isinstance(data, dict) and data.get("success"):
                        wh = data.get("selected_warehouse", {})
                        veh = data.get("selected_vehicle", {})
                        reasoning.append(f"Recommended: {veh.get('id')} from {wh.get('id')} for {data.get('request', {}).get('resource')}")
                elif tool == "get_impact":
                    data = result.data if hasattr(result, 'data') else result
                    if isinstance(data, dict):
                        score = data.get("impact_score", 0)
                        level = data.get("impact_level", "UNKNOWN")
                        reasoning.append(f"Impact analysis: score {score}, level {level}")
        return reasoning


llm_service = None

async def get_llm_service() -> LLMService:
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
    return llm_service