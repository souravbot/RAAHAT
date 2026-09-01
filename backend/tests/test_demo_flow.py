import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_demo_reset_returns_ready_state():
    response = client.post('/demo/reset')
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['success'] is True
    assert payload['demo_state'] == 'READY'
    assert 'timestamp' in payload


def test_demo_run_scenario_executes_full_story():
    reset_response = client.post('/demo/reset')
    assert reset_response.status_code == 200, reset_response.text

    response = client.post('/demo/run-scenario')
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload['success'] is True
    assert payload['demo']['scenario_name'] == 'Central Bridge Disruption'
    assert payload['disruption']['edge_id'] == 'E023'
    assert payload['story']
    assert len(payload['story']) >= 5
    assert payload['priority']['selected_target']
    assert 'selected_priority_target' in payload['priority']
    assert payload['recommendation']['success'] is True
