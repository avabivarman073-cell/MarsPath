"""Temperature-only endpoints extracted from MarsPath 2.0 backend/science.py.
Original computation, labels, and missing-data policy retained.
"""
from __future__ import annotations
import csv
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
THERMAL_DIR = Path(__file__).resolve().parent / 'data' / 'science' / 'thermal'

def _optional_number(value: str, *, integer: bool = False):
    if value is None or value.strip() == '':
        return None
    try:
        return int(value) if integer else float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=500, detail='Thermal source CSV contains an invalid numeric value')


@router.get('/api/science/thermal/sol-15')
def thermal_sol_15():
    """Return hourly MEDA TIRS irradiance and ATS air-temperature context for Sol 15."""
    csv_path = THERMAL_DIR / 'jezero_sol15_thermal_hourly_comparison.csv'
    summary_path = THERMAL_DIR / 'jezero_sol15_thermal_summary.json'
    if not csv_path.is_file() or not summary_path.is_file():
        raise HTTPException(status_code=503, detail='Sol 15 thermal source files are not installed')
    with summary_path.open(encoding='utf-8') as source:
        summary = json.load(source)
    hourly = []
    with csv_path.open(encoding='utf-8', newline='') as source:
        for row in csv.DictReader(source):
            hourly.append({
                'sol': _optional_number(row.get('sol'), integer=True),
                'lmstHour': _optional_number(row.get('lmst_hour'), integer=True),
                'tirsValidRecords': _optional_number(row.get('tirs_valid_records'), integer=True),
                'upwardLongwaveIrradianceWm2': _optional_number(row.get('upward_lw_irradiance_w_m2')),
                'downwardLongwaveIrradianceWm2': _optional_number(row.get('downward_lw_irradiance_w_m2')),
                'atsRecords': _optional_number(row.get('ats_records'), integer=True),
                'atsFiveSensorMeanC': _optional_number(row.get('ats_five_sensor_mean_c')),
            })
    return {
        'sol': summary['sol'],
        'source': summary['source'],
        'periodUtc': summary['period_utc'],
        'spatialScope': summary['spatial_scope'],
        'hourlyMethod': summary['hourly_method'],
        'hourly': hourly,
        'summary': {
            'tirsTotalRecords': summary['tirs_total_records'],
            'tirsFilteredRecords': summary['tirs_filtered_records'],
            'upwardLongwaveIrradianceWm2': summary['tirs_fields']['UPWARD_LW_IRRADIANCE']['stats'],
            'downwardLongwaveIrradianceWm2': summary['tirs_fields']['DOWNWARD_LW_IRRADIANCE']['stats'],
        },
        'qualityNotes': [summary['flags_note'], summary['ground_temperature_note']],
        'groundTemperatureC': None,
        'groundTemperatureNote': summary['ground_temperature_note'],
        'warning': 'Historical rover observations at Sol 15 only; not a live feed or a temperature map for the 2 km × 2 km region.',
    }



@router.get('/api/science/thermal/sol-15/estimate')
def estimate_sol15_temperature(lmst_minute: int = Query(ge=0, le=1439)):
    """Time-weighted linear interpolation across nearest valid hourly ATS means.

    Results across missing hour bins are estimates (not measured values).
    No extrapolation before the first or after the last recorded hour.
    """
    csv_path = THERMAL_DIR / 'jezero_sol15_thermal_hourly_comparison.csv'
    if not csv_path.is_file():
        raise HTTPException(status_code=503, detail='Sol 15 thermal CSV is not installed')
    rows = []
    with csv_path.open(encoding='utf-8', newline='') as source:
        for row in csv.DictReader(source):
            raw = row.get('ats_five_sensor_mean_c', '')
            if raw is not None and raw.strip():
                rows.append((int(row['lmst_hour']) * 60, float(raw)))
    rows.sort()
    response = {
        'sol': 15, 'lmstMinute': lmst_minute,
        'lmstTime': f'{lmst_minute//60:02d}:{lmst_minute%60:02d}',
        'unit': '°C', 'source': 'NASA Mars 2020 MEDA ATS Sol 15',
        'spatialScope': 'Perseverance rover location; not a waypoint-specific measurement',
    }
    exact = next((val for minute, val in rows if minute == lmst_minute), None)
    if exact is not None:
        return {**response, 'temperatureC': exact, 'status': 'measured', 'method': 'MEDA ATS hourly mean'}
    right = next((i for i, (minute, _) in enumerate(rows) if minute > lmst_minute), None)
    if right is None or right == 0:
        return {**response, 'temperatureC': None, 'status': 'unavailable', 'method': None,
                'reason': 'No two recorded hourly observations bracket this time; extrapolation is disabled.'}
    t0, v0 = rows[right - 1]
    t1, v1 = rows[right]
    weight = (lmst_minute - t0) / (t1 - t0)
    estimate = v0 + weight * (v1 - v0)
    return {**response, 'temperatureC': round(estimate, 4), 'status': 'estimated',
            'method': 'LINEAR', 'lowerHour': t0 // 60, 'upperHour': t1 // 60,
            'note': 'Time-weighted interpolation between historical hourly means, NOT a direct measurement.'}
