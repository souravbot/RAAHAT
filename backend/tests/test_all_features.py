import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "raahat-backend"


def test_twin_snapshot():
    response = client.get("/twin")
    assert response.status_code == 200
    data = response.json()
    assert "metadata" in data
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0


def test_accessibility_endpoints():
    response = client.get("/accessibility")
    assert response.status_code == 200
    data = response.json()
    assert "villages" in data or "data" in data or isinstance(data, (list, dict))

    summary_resp = client.get("/accessibility/summary")
    assert summary_resp.status_code == 200


def test_disruption_and_reset():
    # Reset first
    reset_resp = client.post("/reset")
    assert reset_resp.status_code == 200

    # Apply disruption
    disrupt_resp = client.post("/disruption", json={
        "edge_id": "E001",
        "type": "closure"
    })
    assert disrupt_resp.status_code == 200
    disrupt_data = disrupt_resp.json()
    assert "updated_edge" in disrupt_data or "event" in disrupt_data

    # Reset back
    reset_resp2 = client.post("/reset")
    assert reset_resp2.status_code == 200


def test_simulation():
    sim_resp = client.post("/simulate", json={
        "edge_id": "E002",
        "type": "closure"
    })
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert "simulation_id" in sim_data or "simulated_edge" in sim_data


def test_impact_analysis():
    impact_resp = client.post("/impact/E023")
    assert impact_resp.status_code == 200
    data = impact_resp.json()
    assert "data" in data or "impact_score" in data or "affected_villages" in data


def test_depletion_analysis():
    dep_resp = client.get("/depletion")
    assert dep_resp.status_code == 200
    data = dep_resp.json()
    assert "alerts" in data or "data" in data

    summary_resp = client.get("/depletion/summary/regional")
    assert summary_resp.status_code == 200


def test_priority_ranking():
    pri_resp = client.get("/priority")
    assert pri_resp.status_code == 200
    data = pri_resp.json()
    assert "priorities" in data or "data" in data or "summary" in data


def test_recommendation_engine():
    rec_resp = client.post("/recommend-action", json={
        "target_node": "H001",
        "resource": "medicine",
        "required_quantity": 250,
        "priority": "MODERATE"
    })
    assert rec_resp.status_code == 200
    data = rec_resp.json()
    assert data.get("success") is True or "selected_warehouse" in data or "selected_route" in data


def test_scenario_analysis_and_compare():
    scen_resp = client.post("/scenario", json={
        "edge_id": "E023",
        "type": "closure"
    })
    assert scen_resp.status_code == 200

    compare_resp = client.post("/scenario/compare", json={
        "request_a": {
            "edge_id": "E023",
            "type": "closure"
        },
        "request_b": {
            "edge_id": "E001",
            "type": "closure"
        }
    })
    assert compare_resp.status_code == 200


def test_assistant_ask():
    ask_resp = client.post("/ask", json={
        "question": "Which villages are currently isolated or at risk?"
    })
    assert ask_resp.status_code == 200
    data = ask_resp.json()
    assert "answer" in data
    assert len(data["answer"]) > 0


def test_demo_orchestration():
    reset_resp = client.post("/demo/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    run_resp = client.post("/demo/run-scenario")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["success"] is True
    assert "story" in run_data
    assert len(run_data["story"]) >= 6
