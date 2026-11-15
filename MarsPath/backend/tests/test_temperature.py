from pathlib import Path
import sys
from fastapi import FastAPI
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from temperature import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_hourly_thermal_data():
    r = client.get('/api/science/thermal/sol-15')
    assert r.status_code == 200
    data = r.json()
    assert data['sol'] == 15 and len(data['hourly']) == 24
    assert data['groundTemperatureC'] is None

def test_measured_and_gap_handling():
    assert client.get('/api/science/thermal/sol-15/estimate?lmst_minute=720').json()['status'] == 'measured'
    # 08:30 lies between the nearest valid 04:00 and 12:00 readings.
    response = client.get('/api/science/thermal/sol-15/estimate?lmst_minute=510').json()
    assert response['status'] == 'estimated'
    assert response['lowerHour'] == 4 and response['upperHour'] == 12
    assert abs(response['temperatureC'] - (-78.28 + (4.5/8)*(-32.25 + 78.28))) < .001
    # 10:43 maps to a weighted estimate across the same source readings.
    at1043 = client.get('/api/science/thermal/sol-15/estimate?lmst_minute=643').json()
    assert at1043['status'] == 'estimated'
    assert abs(at1043['temperatureC'] - (-78.28 + (403/480)*46.03)) < .001
    assert client.get('/api/science/thermal/sol-15/estimate?lmst_minute=1439').json()['status'] == 'unavailable'
