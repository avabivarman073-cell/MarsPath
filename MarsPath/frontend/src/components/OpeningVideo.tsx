import {useEffect,useRef,useState} from 'react';
import './opening-video.css';

type Props={open:boolean;onSkip:()=>void;onGuidedTour:()=>void;embedded?:boolean};

/** A one-time intro with exactly two actions. */
export function OpeningVideo({open,onSkip,onGuidedTour,embedded=false}:Props){
 const videoRef=useRef<HTMLVideoElement>(null);
 const triggered=useRef(false);
 const [videoError,setVideoError]=useState(false);
 const [soundOn,setSoundOn]=useState(false);
 useEffect(()=>{
  if(!open)return;
  triggered.current=false;
  setVideoError(false);
  setSoundOn(false);
  const video=videoRef.current;
  if(!video)return;
  video.currentTime=0;
  video.muted=true; // Browser-safe autoplay. A real user gesture is needed for audio.
  void video.play().catch(()=>{/* Muted autoplay can be blocked by the browser. */});
 },[open]);
 const enableAudio=()=>{
  const video=videoRef.current;
  if(!video)return;
  video.muted=false;
  video.volume=1;
  setSoundOn(true);
  void video.play().catch(()=>{});
 };
 const start=()=>{
  if(triggered.current)return;
  triggered.current=true;
  onGuidedTour();
 };
 if(!open)return null;
 return <div className={embedded?'marspath-opening embedded':'marspath-opening'} role="dialog" aria-modal={!embedded} aria-labelledby="marspath-opening-title">
  <div className="marspath-opening-card">
   <header className="marspath-opening-heading"><h2 id="marspath-opening-title">Welcome to MarsPath</h2></header>
   <div className="marspath-opening-player" onClick={!soundOn?enableAudio:undefined} title={!soundOn?"Click the video to enable sound":undefined}>
    {!videoError?<video ref={videoRef} src="/media/marspath-tour.mp4" autoPlay muted={!soundOn} controls playsInline preload="metadata" loop={false} onEnded={start} onError={()=>setVideoError(true)} aria-label="MarsPath landing introduction video"/>:
    <div className="marspath-opening-error">The introduction video could not load. You can still start the walkthrough.</div>}
    {!soundOn&&!videoError&&<div className="marspath-audio-hint">Tap video to enable sound 🔊</div>}
   </div>
   <div className="marspath-opening-actions">
    <button type="button" className="marspath-start" onClick={start}>Skip video and start walkthrough</button>
    <button type="button" className="marspath-skip" onClick={onSkip}>Exit to Home</button>
   </div>
  </div>
 </div>;
}
