import type {ThermalHour} from './thermalClient';

export type HourlyTemperatureReading = {
  temperatureC:number|null;
  status:'measured'|'estimated'|'unavailable';
  lowerHour?:number;
  upperHour?:number;
  method?:string;
};

/** Estimate a historical Sol 15 air temperature from the nearest recorded hourly
 * means. Interpolation is weighted by the elapsed minutes, NOT an arithmetic
 * 50/50 average unless the request is exactly at the midpoint.
 * Gaps may span several hours; never call interpolated numbers measurements.
 * Do not extrapolate outside the valid sample interval.
 */
export function temperatureAtLocalMinute(hourly:ThermalHour[], localMinute:number):HourlyTemperatureReading {
  if (!Number.isFinite(localMinute) || localMinute < 0 || localMinute >= 1440) {
    return {temperatureC:null,status:'unavailable'};
  }
  const valid = hourly
    .filter(row => row.lmstHour !== null && row.atsFiveSensorMeanC !== null && Number.isFinite(row.atsFiveSensorMeanC))
    .map(row => ({minute:(row.lmstHour as number)*60,value:row.atsFiveSensorMeanC as number}))
    .sort((a,b)=>a.minute-b.minute);
  const exact = valid.find(row=>row.minute===localMinute);
  if (exact) return {temperatureC:exact.value,status:'measured'};
  const rightIndex = valid.findIndex(row=>row.minute>localMinute);
  if(rightIndex<=0) return {temperatureC:null,status:'unavailable'};
  const before=valid[rightIndex-1];
  const after=valid[rightIndex];
  const fraction=(localMinute-before.minute)/(after.minute-before.minute);
  return {
    temperatureC:before.value+(after.value-before.value)*fraction,
    status:'estimated',
    lowerHour:before.minute/60,
    upperHour:after.minute/60,
    method:'Linear interpolation',
  };
}
