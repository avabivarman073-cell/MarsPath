import {useMemo} from 'react';
import type {Point, Route} from './types';
import {positionAt} from './MapView';
import {Compass} from './Terrain';
import JezeroTerrain3D from './JezeroTerrain3D';

export default function VisorView({route,progress,position,manual=false,travelHeading}:{travelHeading?:number;route:Route|null;progress:number;position:Point|null;manual?:boolean}) {
  const current=manual?position:(position||positionAt(route?.geometry,progress));
  const bearing=useMemo(()=>{
    if(!route||!current||manual||route.geometry.length<2)return 0;
    let nearest=0,best=Infinity;
    route.geometry.forEach((p,i)=>{const d=Math.hypot(p.row-current.row,p.col-current.col);if(d<best){best=d;nearest=i}});
    const a=route.geometry[Math.min(nearest,route.geometry.length-2)],b=route.geometry[Math.min(nearest+1,route.geometry.length-1)];
    return (Math.atan2(b.col-a.col,a.row-b.row)*180/Math.PI+360)%360;
  },[route,current?.row,current?.col,manual]);
  const heading=travelHeading??bearing;
  return <div className="jezero-3d-visor-shell">
    <JezeroTerrain3D position={current} heading={heading} route={route}/>
    <div className="jezero-3d-compass" aria-label={`Route compass heading ${heading.toFixed(0)} degrees`}><Compass heading={heading}/></div>
  </div>;
}
