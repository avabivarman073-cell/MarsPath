/** Temperature-only client extracted from original scienceContext.ts */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export type ScienceLoad<T> = {data:T; origin:'api'|'static'};


/** Read the API first; for public URL demos, read an identical static snapshot.
 * No simulated data is generated if the backend is offline. */
async function readWithFallback<T>(path:string, staticPath:string):Promise<ScienceLoad<T>> {
  try {
    const response=await fetch(`${API_BASE}${path}`,{signal:AbortSignal.timeout(7500)});
    if(!response.ok) throw new Error(`Science API returned ${response.status}`);
    return {data:await response.json() as T,origin:'api'};
  } catch {
    const response=await fetch(staticPath);
    if(!response.ok)throw new Error('Neither API nor static science records could be loaded');
    return {data:await response.json() as T,origin:'static'};
  }
}

export type ThermalHour = {
  sol: number | null;
  lmstHour: number | null;
  tirsValidRecords: number | null;
  upwardLongwaveIrradianceWm2: number | null;
  downwardLongwaveIrradianceWm2: number | null;
  atsRecords: number | null;
  atsFiveSensorMeanC: number | null;
};
export type ThermalSol15Response = {
  sol: number;
  source: string;
  periodUtc: {start:string;end:string};
  spatialScope: string;
  hourlyMethod: string;
  hourly: ThermalHour[];
  summary: {
    tirsTotalRecords: number;
    tirsFilteredRecords: number;
    upwardLongwaveIrradianceWm2: {n:number;min:number;max:number;mean:number};
    downwardLongwaveIrradianceWm2: {n:number;min:number;max:number;mean:number};
  };
  qualityNotes: string[];
  groundTemperatureC: number | null;
  groundTemperatureNote: string;
  warning: string;
};

export function loadThermalSol15() {
  return readWithFallback<ThermalSol15Response>('/api/science/thermal/sol-15','/data/science/thermal_sol15.json');
}

export type TemperatureEstimate = {
  sol:number;
  lmstMinute:number;
  lmstTime:string;
  temperatureC:number|null;
  status:'measured'|'estimated'|'unavailable';
  method:string|null;
  unit:'°C';
  source:string;
  spatialScope:string;
  reason?:string;
};
export async function loadTemperatureEstimate(lmstMinute:number):Promise<TemperatureEstimate> {
  const response=await fetch(`${API_BASE}/api/science/thermal/sol-15/estimate?lmst_minute=${lmstMinute}`,{signal:AbortSignal.timeout(7500)});
  if(!response.ok) throw new Error(`Temperature estimate API returned ${response.status}`);
  return response.json() as Promise<TemperatureEstimate>;
}
