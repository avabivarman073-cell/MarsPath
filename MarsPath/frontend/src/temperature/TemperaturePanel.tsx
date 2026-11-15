import {useEffect,useState} from 'react';
import {loadThermalSol15} from './thermalClient';
import type {ScienceLoad,ThermalSol15Response} from './thermalClient';
import './temperature.css';
import {temperatureAtLocalMinute} from './temperatureInterpolation';

/** Uses the laptop clock as a demo selector for historical Sol 15 LMST.
 * Missing hours and between-hour values are estimated using the surrounding
 * measured means, and clearly marked as estimates rather than observations.
 */
export function AirTemperaturePanel({missionId='rover-navigation-jezero'}:{missionId?:string}) {
  const [now,setNow]=useState(()=>new Date());
  const [result,setResult]=useState<ScienceLoad<ThermalSol15Response>|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const interval=window.setInterval(()=>setNow(new Date()),15000);
    const onVisible=()=>setNow(new Date());
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisible)};
  },[]);
  useEffect(()=>{
    let live=true;
    loadThermalSol15().then(data=>{if(live)setResult(data)}).catch(()=>{if(live)setError('Temperature data unavailable; check the API or bundled data.');});
    return ()=>{live=false};
  },[]);
  const hour=now.getHours();
  const minute=hour*60+now.getMinutes();
  const reading=result?temperatureAtLocalMinute(result.data.hourly,minute):null;
  const temperature=reading?.temperatureC;
  const localTime=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});
  return <section className="science-environment science-hourly-temperature" aria-label="Clock-matched historical Martian air temperature">
    <div className="science-panel-heading"><h2>Air temperature</h2><span className="science-status-tag">Historical · Clock matched</span></div>
    {missionId==='water-ice-arcadia'?<p className="science-scientific-warning">Jezero Sol 15 observations do not describe Arcadia Planitia.</p>:<>
      <div className="science-environment-card">
        <span>Jezero · MEDA ATS · Sol 15</span>
        <strong aria-live="polite">{!result&&!error?'Loading…':temperature==null?'Not available':`${temperature.toFixed(2)} °C`}</strong>
        <small>Device time: {localTime} · Historical comparison time: {localTime} LMST</small>
        <small className="science-thermal-reading-label">{!result?'Loading data…':reading?.status==='measured'?'Historical measurement':reading?.status==='estimated'?'Historical estimate':'Historical reading unavailable'}</small>
        {error&&<small role="alert">{error}</small>}
      </div>
      <details className="science-context-references science-temperature-details">
        <summary>About this temperature</summary>
        <p>The device clock chooses a corresponding historical Mars local time (LMST) in the Jezero Sol 15 dataset. It does not display the current temperature on Mars.</p>
        <p>Between observed hours, the value is estimated using linear interpolation. Estimates are not direct measurements, and wider gaps increase uncertainty.</p>
        <p>This is rover-site air temperature, not ground temperature or a safety forecast.</p>
        {reading?.status==='estimated'&&<p>Estimated between {String(reading.lowerHour).padStart(2,'0')}:00 and {String(reading.upperHour).padStart(2,'0')}:00 historical LMST readings.</p>}
      </details>
    </>}
  </section>;
}

/** Sol 15 MEDA context: rover-local historical observations, never a regional temperature map. */
export function ThermalHistoryPanel({missionId='rover-navigation-jezero'}:{missionId?:string}) {
  const [result,setResult]=useState<ScienceLoad<ThermalSol15Response>|null>(null);
  const [error,setError]=useState('');
  const [showAll,setShowAll]=useState(false);
  useEffect(()=>{
    let live=true;
    loadThermalSol15().then(data=>{if(live)setResult(data)}).catch(()=>{if(live)setError('Sol 15 thermal records could not be loaded. Check that the backend data files are installed.');});
    return ()=>{live=false};
  },[]);
  if(missionId==='water-ice-arcadia') return <section className="science-thermal"><h2>Thermal history · Sol 15</h2><p className="science-scientific-warning">These measurements were recorded at the Jezero rover location and must not be attributed to Arcadia Planitia.</p></section>;
  const data=result?.data;
  const validAir=(data?.hourly||[]).filter(row=>row.atsFiveSensorMeanC!==null&&row.lmstHour!==null);
  const min=validAir.length?Math.min(...validAir.map(row=>row.atsFiveSensorMeanC as number)):-100;
  const max=validAir.length?Math.max(...validAir.map(row=>row.atsFiveSensorMeanC as number)):-50;
  const range=Math.max(1,max-min);
  const shownRows=showAll?(data?.hourly||[]):(data?.hourly||[]).filter(row=>row.atsFiveSensorMeanC!==null||row.upwardLongwaveIrradianceWm2!==null);
  return <section className="science-thermal" aria-label="Jezero Sol 15 thermal observations">
    <div className="science-panel-heading">
      <div><span className="science-eyebrow">NASA PDS · MEDA · SOL 15</span><h2>Thermal history</h2></div>
      <span className="science-status-tag">Historical · Not live</span>
    </div>
    {!data&&!error&&<p className="science-muted" role="status">Loading Sol 15 observations…</p>}
    {error&&<p className="science-scientific-warning" role="alert">{error}</p>}
    {data&&<>
      <p className="science-muted">{data.source} · {new Date(data.periodUtc.start).toLocaleDateString()} – {new Date(data.periodUtc.end).toLocaleDateString()} UTC</p>
      <div className="science-thermal-stats">
        <div><span>Mean upward longwave irradiance</span><strong>{data.summary.upwardLongwaveIrradianceWm2.mean.toFixed(2)} <small>W/m²</small></strong></div>
        <div><span>Mean downward longwave irradiance</span><strong>{data.summary.downwardLongwaveIrradianceWm2.mean.toFixed(2)} <small>W/m²</small></strong></div>
        <div><span>Filtered TIRS records</span><strong>{data.summary.tirsFilteredRecords.toLocaleString()}</strong></div>
      </div>
      <div className="science-thermal-chart">
        <strong>ATS five-sensor mean air temperature</strong>
        <span className="science-muted">Each dot is an original measured hourly mean; the separate current-temperature card estimates between available readings.</span>
        <svg viewBox="0 0 600 160" role="img" aria-label="Hourly air temperature observations in degrees Celsius; points are shown only for hours with observations">
          {[0,1,2,3].map(i=><g key={i}><line x1="42" x2="580" y1={18+i*38} y2={18+i*38} stroke="currentColor" opacity=".16"/><text x="4" y={22+i*38} fontSize="10" fill="currentColor">{(max-(range*i/3)).toFixed(0)}°</text></g>)}
          {validAir.map(row=>{
            const x=48+(row.lmstHour as number)/23*520;
            const y=18+(max-(row.atsFiveSensorMeanC as number))/range*114;
            return <g key={row.lmstHour}><circle cx={x} cy={y} r="4.5" fill="#e4b879"><title>{`LMST ${String(row.lmstHour).padStart(2,'0')}:00 · ${row.atsFiveSensorMeanC} °C`}</title></circle><text x={x} y="151" textAnchor="middle" fontSize="9" fill="currentColor">{row.lmstHour}</text></g>;
          })}
        </svg>
        <div className="science-thermal-axis"><span>LMST hour 0</span><span>LMST hour 23</span></div>
      </div>
      <div className="science-thermal-table-wrap">
        <div className="science-thermal-table-heading"><strong>Hourly source records</strong><button type="button" className="inline-link" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show available hours':'Show all 24 hours'}</button></div>
        <table className="science-thermal-table">
          <thead><tr><th>LMST</th><th>Upward W/m²</th><th>Downward W/m²</th><th>ATS air °C</th></tr></thead>
          <tbody>{shownRows.map(row=><tr key={row.lmstHour}><td>{String(row.lmstHour).padStart(2,'0')}:00</td><td>{row.upwardLongwaveIrradianceWm2===null?'—':row.upwardLongwaveIrradianceWm2.toFixed(2)}</td><td>{row.downwardLongwaveIrradianceWm2===null?'—':row.downwardLongwaveIrradianceWm2.toFixed(2)}</td><td>{row.atsFiveSensorMeanC===null?'—':row.atsFiveSensorMeanC.toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="science-scientific-warning">Ground temperature is not supplied. TIRS irradiance (W/m²) is not ground temperature. ATS values are air temperature measured at the rover, not a temperature map for Jezero.</p>
      <p className="science-muted">{data.spatialScope} · {data.hourlyMethod}</p>
      {data.qualityNotes.map((note,i)=><p className="science-muted" key={i}>{note}</p>)}
      <a href="https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html" target="_blank" rel="noopener noreferrer">NASA PDS MEDA archive ↗</a>
      {result?.origin==='static'&&<small className="science-muted">Showing the bundled static data snapshot because the backend API was unavailable.</small>}
    </>}
  </section>;
}
