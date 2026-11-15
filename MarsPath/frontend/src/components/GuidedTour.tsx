import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Page, StartMode} from '../types';
import './guided-tour.css';
import {TourAvatar3D} from './TourAvatar3D';

type Props={active:boolean;page:Page;step:number;setStep:(step:number)=>void;onClose:()=>void;onStart:()=>void;startMode:StartMode;manualLat:string;manualLon:string;routeReady:boolean};
type TourDialogue = {speaker: 'Alex' | 'Sham'; text: string};
type TourStep = {dialogue: TourDialogue[]; targets: string[]; page: Page};
const steps: TourStep[] = [
 {page:'home', targets:['explore'], dialogue:[
  {speaker:'Alex', text:'We lost contact with Earth. How will we explore Mars?'},
  {speaker:'Sham', text:'We have MarsPath! Press Explore Mars.'}
 ]},
 {page:'discover', targets:['terrain'], dialogue:[
  {speaker:'Alex', text:'Should we look for ice, ancient life, or safe ground?'},
  {speaker:'Sham', text:'We need safe ground first. Choose Terrain Exploration!'}
 ]},
 {page:'discover', targets:['jezero-a'], dialogue:[
  {speaker:'Sham', text:'Jezero A has a gentle slope, about 3 degrees.'},
  {speaker:'Alex', text:'Great! Press Select Candidate under Jezero A.'}
 ]},
 {page:'discover', targets:['compare-next'], dialogue:[
  {speaker:'Alex', text:'We picked Jezero A. Should we compare the places? '},
  {speaker:'Sham', text:'You can compare candidates here. Press Continue to confirmation when ready.'}
 ]},
 {page:'discover', targets:['continue'], dialogue:[
  {speaker:'Alex', text:'Terrain Exploration at Jezero A. That looks right!'},
  {speaker:'Sham', text:'Press Continue to Mars Explorer.'}
 ]},
 {page:'map', targets:['butler','manual','advanced','latitude','longitude'], dialogue:[
  {speaker:'Sham', text:'Jezero A is our destination. Now choose our starting point.'},
  {speaker:'Alex', text:'The Butler landing point is already selected. Keep it or choose Advanced start coordinates, then press Next.'}
 ]},
 {page:'map', targets:['generate'], dialogue:[
  {speaker:'Alex', text:'We picked Jezero A and our starting point. Are we ready?'},
  {speaker:'Sham', text:'Yes! Press Generate Routes to find our path.'}
 ]},
 {page:'map', targets:['start-simulation'], dialogue:[
  {speaker:'Alex', text:'MarsPath has calculated our route!'},
  {speaker:'Sham', text:'Great! Press Start Simulation to begin our Marswalk.'}
 ]},
 {page:'navigate', targets:[], dialogue:[
  {speaker:'Alex', text:'We have our route and our destination.'},
  {speaker:'Sham', text:"Let's GO! Our Mars exploration begins now!"}
 ]}
];
export function GuidedTour({active,page,step,setStep,onClose,onStart,startMode,manualLat,manualLon,routeReady}:Props){
 const [rect,setRect]=useState<DOMRect|null>(null);
 const targetRef=useRef<HTMLElement|null>(null);
 const dialogRef=useRef<HTMLElement|null>(null);
 const [dialogSize,setDialogSize]=useState({width:500,height:340});
 const [viewport,setViewport]=useState({width:typeof window==='undefined'?1200:window.innerWidth,height:typeof window==='undefined'?800:window.innerHeight});
 
 const [waiting,setWaiting]=useState(false);
 const [dialogueIndex,setDialogueIndex]=useState(0);
 useEffect(()=>{setDialogueIndex(0);setWaiting(false)},[step,active]);
 const config=steps[Math.min(step,steps.length-1)];
 const visible=active&&page===config.page;
 const lastDialogue=dialogueIndex>=config.dialogue.length-1;
 const canClickWebsite=visible&&lastDialogue&&!waiting&&step<8;
 useLayoutEffect(()=>{
  if(!active||!dialogRef.current)return;
  const measure=()=>{
   if(!dialogRef.current)return;
   const r=dialogRef.current.getBoundingClientRect();
   setDialogSize({width:r.width,height:r.height});
   setViewport({width:window.innerWidth,height:window.innerHeight});
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(dialogRef.current);
  window.addEventListener('resize',measure);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure)};
 },[active]);

 // Place the guide where it cannot cover the highlighted real control.
 // Unlike the earlier alternating-corner implementation, this considers the
 // current dialogue dimensions AND the target rectangle in every layout.
 const margin=14;
 const w=Math.min(dialogSize.width,Math.max(240,viewport.width-2*margin));
 const h=Math.min(dialogSize.height,Math.max(1,viewport.height-2*margin));
 const maxX=Math.max(margin,viewport.width-w-margin);
 const maxY=Math.max(margin,viewport.height-h-margin);
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,max));
 const candidates=[
  {side:'left', x:margin, y:margin},
  {side:'right', x:maxX, y:margin},
  {side:'left', x:margin, y:maxY},
  {side:'right', x:maxX, y:maxY},
  {side:'left', x:margin, y:clamp(viewport.height/2-h/2,margin,maxY)},
  {side:'right', x:maxX, y:clamp(viewport.height/2-h/2,margin,maxY)},
 ];
 if(rect){
  candidates.push(
   {side:'left',x:clamp(rect.left-w-24,margin,maxX),y:clamp(rect.top,margin,maxY)},
   {side:'right',x:clamp(rect.right+24,margin,maxX),y:clamp(rect.top,margin,maxY)},
   {side:'left',x:clamp(rect.left,margin,maxX),y:clamp(rect.top-h-24,margin,maxY)},
   {side:'right',x:clamp(rect.left,margin,maxX),y:clamp(rect.bottom+24,margin,maxY)},
  );
 }
 const intersect=(x:number,y:number,r:DOMRect,pad=22)=>{
  const iw=Math.max(0,Math.min(x+w,r.right+pad)-Math.max(x,r.left-pad));
  const ih=Math.max(0,Math.min(y+h,r.bottom+pad)-Math.max(y,r.top-pad));
  return iw*ih;
 };
 const best=candidates.map((c,i)=>{
  // Any intersection with the action is far worse than changing sides.
  const cover=rect?intersect(c.x,c.y,rect):0;
  const preferredSide=step%2===0?'left':'right';
  const edgePreference=c.side===preferredSide?0:100;
  return {...c,score:cover*100000 + edgePreference + i};
 }).sort((a,b)=>a.score-b.score)[0];
 const dialogPosition={left:best.x,top:best.y,bottom:'auto' as const,right:'auto' as const};
 useEffect(()=>{if(active&&step===6&&routeReady&&waiting){setWaiting(false);setStep(7)}},[active,step,routeReady,waiting,setStep]);
 // Keep the glow attached to the actual enabled button, not a cached position.
 // A fixed viewport rectangle must be recalculated when inner panels scroll,
 // the window resizes, or a loading/disabled state changes.
 useLayoutEffect(()=>{
  targetRef.current=null;
  setRect(null);
  if(!canClickWebsite || step===5 || !config.targets.length)return;

  let frame=0;
  let disposed=false;
  let targetObserver:ResizeObserver|null=null;
  const watchTarget=(element:HTMLElement|null)=>{
   if(targetRef.current===element)return;
   targetObserver?.disconnect();
   targetRef.current=element;
   if(element){
    targetObserver=new ResizeObserver(()=>schedule());
    targetObserver.observe(element);
   }
  };
  const candidate=()=>{
   for(const id of config.targets){
    const element=document.querySelector<HTMLElement>(`[data-tour-target="${id}"]`);
    if(!element || !element.isConnected || !element.getClientRects().length)continue;
    const style=getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
    if(element.matches(':disabled,[aria-disabled="true"]') || element.querySelector(':disabled,[aria-disabled="true"]'))continue;
    return element;
   }
   return null;
  };
  const update=()=>{
   frame=0;
   if(disposed)return;
   const element=candidate();
   watchTarget(element);
   if(!element){setRect(null);return;}
   const r=element.getBoundingClientRect();
   // Only highlight the part actually visible in the viewport AND scroll panels.
   let left=Math.max(0,r.left),top=Math.max(0,r.top);
   let right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
   for(let parent=element.parentElement;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent);
    if(!/(auto|scroll|hidden|clip)/.test(style.overflow+style.overflowX+style.overflowY))continue;
    const p=parent.getBoundingClientRect();
    left=Math.max(left,p.left);top=Math.max(top,p.top);
    right=Math.min(right,p.right);bottom=Math.min(bottom,p.bottom);
   }
   if(right-left<2||bottom-top<2){setRect(null);return;}
   setRect(previous=>{
    if(previous&&Math.abs(previous.left-left)<.5&&Math.abs(previous.top-top)<.5&&
       Math.abs(previous.width-(right-left))<.5&&Math.abs(previous.height-(bottom-top))<.5)return previous;
    return new DOMRect(left,top,right-left,bottom-top);
   });
  };
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(update);}
  schedule();
  // Bring the currently required action into view once after navigation.
  const scrollTimer=window.setTimeout(()=>{
   const element=candidate();
   if(!element)return;
   const r=element.getBoundingClientRect();
   if(r.top<95||r.bottom>innerHeight-70){
    element.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
   }
   schedule();
  },200);
  const observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('main-content')||document.body,{
   subtree:true,childList:true,attributes:true,
   attributeFilter:['disabled','aria-disabled','hidden','open','class','style']
  });
  window.addEventListener('resize',schedule);
  window.addEventListener('scroll',schedule,true);
  return()=>{
   disposed=true;
   clearTimeout(scrollTimer);
   if(frame)cancelAnimationFrame(frame);
   targetObserver?.disconnect();observer.disconnect();
   window.removeEventListener('resize',schedule);
   window.removeEventListener('scroll',schedule,true);
  };
 },[canClickWebsite,step,page]);
 useEffect(()=>{
  if(!active)return;
  // Capture phase: unrelated buttons, inputs, links and keyboard commands cannot change the website.
  const allowed=(node:EventTarget|null)=>{
   const element=node instanceof Element?node:null;
   if(element?.closest('[data-guided-tour-ui]'))return true;
   if(!canClickWebsite)return false;
   const label=element?.closest('label');
   if(label){const radio=label.querySelector('[data-tour-target]');if(radio&&config.targets.includes(radio.getAttribute('data-tour-target')||''))return true;}
   const control=element?.closest('[data-tour-target]');
   return !!control&&config.targets.includes(control.getAttribute('data-tour-target')||'')&&!control.matches(':disabled,[aria-disabled="true"]')&&!control.querySelector(':disabled,[aria-disabled="true"]');
  };
  const block=(e:Event)=>{
   if(allowed(e.target))return;
   e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
  };
  const handle=(e:MouseEvent)=>{
   if(!allowed(e.target)){block(e);return;}
   const el=(e.target as Element)?.closest('[data-tour-target]');
   if(!el)return;
   const key=el.getAttribute('data-tour-target');
   if(step===0&&key==='explore')setStep(1);
   else if(step===1&&key==='terrain')setStep(2);
   else if(step===2&&key==='jezero-a')setStep(3);
   else if(step===3&&key==='compare-next')setStep(4);
   else if(step===4&&key==='continue')setStep(5);
   else if(step===5&&(key==='butler'||key==='manual')){/* Stay on this step until Next. */}
   else if(step===7&&key==='start-simulation')setStep(8);
   else if(step===6&&key==='generate'){
    if(startMode==='manual'&&(!Number.isFinite(Number(manualLat))||!Number.isFinite(Number(manualLon))||manualLat.trim()===''||manualLon.trim()==='')){e.preventDefault();e.stopPropagation();return;}
    setWaiting(true);
   }
  };
  const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return;}if(e.key==='Tab')return;if(!allowed(e.target)&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))block(e)};
  document.addEventListener('click',handle,true);document.addEventListener('pointerdown',block,true);document.addEventListener('keydown',keydown,true);
  return()=>{document.removeEventListener('click',handle,true);document.removeEventListener('pointerdown',block,true);document.removeEventListener('keydown',keydown,true)};
 },[active,config,canClickWebsite,step,setStep,startMode,manualLat,manualLon]);
 if(!active)return null;
 const main=canClickWebsite&&step!==5?rect:null;
 const left=main?Math.max(0,main.left-6):0;
 const top=main?Math.max(0,main.top-6):0;
 const width=main?main.width+12:0;
 const height=main?main.height+12:0;
 return <div className="guided-root" data-guided-tour-ui>
  <div className="guided-shade" aria-hidden="true"/>
  {visible&&main&&<div className="guided-highlight" aria-hidden="true" style={{left,top,width,height}}/>}
  {visible&&<aside ref={dialogRef} className="guided-dialog" data-side={best.side} style={dialogPosition} role="status" aria-live="polite">
   <div className="guided-head"><span>MARSPath · {step===8?'Tour complete':`Step ${step+1} of 8`}</span><button type="button" onClick={onClose} aria-label="Exit guided tour">✕ Skip tour</button></div>
   <div className="guided-body guided-body-duo">
    <div className="guided-avatar-pair" aria-label="Alex and Sham, MarsPath guides">
     <div className="guided-avatar-container" data-speaking={config.dialogue[dialogueIndex]?.speaker==='Alex'}><TourAvatar3D name="Alex" facing={best.side==='left'?45:-45}/><span>Alex</span></div>
     <div className="guided-avatar-container" data-speaking={config.dialogue[dialogueIndex]?.speaker==='Sham'}><TourAvatar3D name="Sham" facing={best.side==='left'?45:-45}/><span>Sham</span></div>
    </div>
    <div className="guided-conversation">
     {config.dialogue.slice(dialogueIndex,dialogueIndex+1).map(({speaker,text})=><div key={`${step}-${dialogueIndex}`} className={`guided-speech ${speaker==='Alex'?'guided-alex':'guided-sham'}`}>
      <strong>{speaker}</strong><p>{text}</p>
     </div>)}
     {!lastDialogue&&<button type="button" className="guided-next" onClick={()=>setDialogueIndex(i=>i+1)}>Next →</button>}
     {lastDialogue&&step===5&&<button type="button" className="guided-next" onClick={()=>setStep(6)} disabled={startMode==='manual'&&(!manualLat.trim()||!manualLon.trim())}>Next: Generate Routes →</button>}
     {step===5&&startMode==='manual'&&<small>Enter both advanced start coordinates, then press Next.</small>}
     {step===6&&startMode==='manual'&&<small>Your chosen coordinates are ready. Press the highlighted Generate Routes button.</small>}
     {step===8&&lastDialogue&&<button type="button" className="guided-next" onClick={onClose}>Let's GO! →</button>}
     {waiting&&<><small>Route calculation started. When it succeeds, you can start the simulation.</small><button type="button" className="guided-retry" onClick={()=>setWaiting(false)}>Calculation failed? Retry button</button></>}
    </div>
   </div>
   <small className="guided-foot">{!lastDialogue?'Press Next to hear the other astronaut.':step===8?'Your tour is complete. Enjoy exploring Mars!':step===5?'Choose your start, then press Next.':waiting?'Waiting for the route calculation.':'Touch the golden-highlighted website control to continue.'}</small>
  </aside>}
 </div>;
}
