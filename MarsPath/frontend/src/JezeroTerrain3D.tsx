import {useEffect, useMemo, useRef, useState} from 'react';
import type {Point, Route} from './types';

type Mesh = {stepMeters:number;offsetMeters:number;heights:(number|null)[][]};
type Props = {position:Point|null;heading:number;route:Route|null};
type GLResources = {program:WebGLProgram;vertices:WebGLBuffer;indices:WebGLBuffer;count:number;texture:WebGLTexture};
const vertexSource = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aLight;
uniform vec3 uEye;
uniform float uHeading;
uniform float uPitch;
uniform float uAspect;
varying vec2 vUv;
varying float vLight;
varying float vDistance;
void main() {
  vec3 delta = aPosition - uEye;
  float sh = sin(uHeading), ch = cos(uHeading);
  float sp = sin(uPitch), cp = cos(uPitch);
  float forward = delta.x * sh - delta.z * ch;
  float right = delta.x * ch + delta.z * sh;
  float up = delta.y * cp - forward * sp;
  float depth = delta.y * sp + forward * cp;
  float nearPlane = 0.3, farPlane = 4000.0;
  gl_Position = vec4(right / (0.74 * uAspect), up / 0.74,
    depth * (farPlane + nearPlane) / (farPlane - nearPlane) -
    2.0 * farPlane * nearPlane / (farPlane - nearPlane), depth);
  vUv = aUv;
  vLight = aLight;
  vDistance = max(0.0, depth);
}`;

const fragmentSource = `
precision highp float;

uniform sampler2D uTexture;
uniform float uHasTexture;

varying vec2 vUv;
varying float vLight;
varying float vDistance;

void main() {
  vec3 imageColor = texture2D(uTexture, vUv).rgb;

  // Preserve original terrain image details.
  vec3 terrain = imageColor;

  // Apply subtle Martian color grading.
  terrain *= vec3(1.12, 0.91, 0.82);

  // Preserve natural elevation-based shading.
  terrain *= clamp(vLight, 0.75, 1.15);

  // Fallback color if imagery is unavailable.
  if (uHasTexture < 0.5) {
    terrain = vec3(0.55, 0.32, 0.22);
  }

  // Gentle atmospheric haze only in the distance.
  float fog = clamp(
    (vDistance - 900.0) / 2200.0,
    0.0,
    0.30
  );

  terrain = mix(
    terrain,
    vec3(0.58, 0.35, 0.29),
    fog
  );

  gl_FragColor = vec4(terrain, 1.0);
}`;


function compile(gl:WebGLRenderingContext, kind:number, source:string):WebGLShader {
  const shader=gl.createShader(kind);
  if(!shader) throw Error('Unable to create WebGL shader');
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    const message=gl.getShaderInfoLog(shader)||'Shader compilation failed';
    gl.deleteShader(shader);throw Error(message);
  }
  return shader;
}
function makeScene(gl:WebGLRenderingContext,mesh:Mesh):GLResources {
  const vert=compile(gl,gl.VERTEX_SHADER,vertexSource);
  const frag=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  const program=gl.createProgram();
  if(!program)throw Error('Unable to create WebGL program');
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader linking failed');
  const {heights,stepMeters,offsetMeters}=mesh;
  const height=heights.length,width=heights[0].length;
  if(width*height>65535)throw Error('Mesh exceeds WebGL 1 index capacity');
  const datum=heights[Math.floor(height/2)]?.[Math.floor(width/2)]??0;
  const data=new Float32Array(width*height*6);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const i=(row*width+col)*6, elev=heights[row][col]??datum;
    const left=heights[row]?.[Math.max(0,col-1)]??elev;
    const right=heights[row]?.[Math.min(width-1,col+1)]??elev;
    const top=heights[Math.max(0,row-1)]?.[col]??elev;
    const bottom=heights[Math.min(height-1,row+1)]?.[col]??elev;
    const gradientX=(right-left)/(2*stepMeters),gradientZ=(bottom-top)/(2*stepMeters);
    const light=Math.max(.63,Math.min(1.18,.92-gradientX*.52-gradientZ*.32));
    data.set([col*stepMeters+offsetMeters,elev-datum,row*stepMeters+offsetMeters,
      col/(width-1),row/(height-1),light],i);
  }
  const indices:number[]=[];
  for(let r=0;r<height-1;r++)for(let c=0;c<width-1;c++){
    if(heights[r][c]==null||heights[r][c+1]==null||heights[r+1][c]==null||heights[r+1][c+1]==null)continue;
    const a=r*width+c,b=a+1,d=(r+1)*width+c,e=d+1;
    indices.push(a,d,b,b,d,e);
  }
  const vertices=gl.createBuffer(),indicesBuffer=gl.createBuffer(),texture=gl.createTexture();
  if(!vertices||!indicesBuffer||!texture)throw Error('Unable to allocate WebGL buffers');
  gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([180,120,95,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  return {program,vertices,indices:indicesBuffer,count:indices.length,texture};
}
function elevationAt(mesh:Mesh,x:number,z:number):number|null {
  const col=(x-mesh.offsetMeters)/mesh.stepMeters,row=(z-mesh.offsetMeters)/mesh.stepMeters;
  const c=Math.floor(col),r=Math.floor(row);
  if(r<0||c<0||r>=mesh.heights.length-1||c>=mesh.heights[0].length-1)return null;
  const samples=[mesh.heights[r][c],mesh.heights[r][c+1],mesh.heights[r+1][c],mesh.heights[r+1][c+1]];
  if(samples.some(n=>n==null))return null;
  const dx=col-c,dz=row-r;
  return samples[0]!*(1-dx)*(1-dz)+samples[1]!*dx*(1-dz)+samples[2]!*(1-dx)*dz+samples[3]!*dx*dz;
}
const normalize=(n:number)=>(n%360+360)%360;
export default function JezeroTerrain3D({position,heading,route}:Props){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [mesh,setMesh]=useState<Mesh|null>(null);
  const [problem,setProblem]=useState('');
  const [yaw,setYaw]=useState(0),[pitch,setPitch]=useState(0);
  const [offset,setOffset]=useState({x:0,z:0});
  const [textured,setTextured]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [look,setLook]=useState(false);
  const renderer=useRef<{gl:WebGLRenderingContext;resources:GLResources;hasTexture:boolean}|null>(null);
  const pointer=useRef<{x:number;y:number}|null>(null);
  const angle=normalize(heading+yaw);
  const base=useMemo(()=>position?{x:position.col*5+2.5,z:position.row*5+2.5}:null,[position?.col,position?.row]);
  const x=(base?.x??1000)+offset.x,z=(base?.z??1000)+offset.z;
  const height=mesh?elevationAt(mesh,x,z):null;
  useEffect(()=>{let active=true;
    fetch('/data/terrain/mesh.json').then(r=>{if(!r.ok)throw Error('Jezero terrain mesh not found');return r.json() as Promise<Mesh>})
    .then(m=>{if(active)setMesh(m)}).catch(e=>{if(active)setProblem(String(e))});
    return()=>{active=false};
  },[]);
  useEffect(()=>{setOffset({x:0,z:0});setYaw(0);setPitch(0)},[position?.row,position?.col]);
  useEffect(()=>{
    const el=canvas.current;if(!el||!mesh)return;
    const gl=el.getContext('webgl',{alpha:true,antialias:true});
    if(!gl){setProblem('WebGL unavailable. Enable hardware acceleration in your browser.');return;}
    let resources:GLResources;
    try{resources=makeScene(gl,mesh)}catch(e){setProblem(String(e));return;}
    renderer.current={gl,resources,hasTexture:false};
    let disposed=false;
    const image=new Image();
    image.onload=()=>{
      if(disposed)return;
      gl.bindTexture(gl.TEXTURE_2D,resources.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      if(renderer.current)renderer.current.hasTexture=true;
      setTextured(true);
    };
    image.onerror=()=>{if(!disposed)setTextured(false)};
    image.src='/data/landing_area_ortho_preview.png';
    return()=>{
      disposed=true;image.onload=null;renderer.current=null;
      gl.deleteBuffer(resources.vertices);gl.deleteBuffer(resources.indices);
      gl.deleteTexture(resources.texture);gl.deleteProgram(resources.program);
    };
  },[mesh]);
  useEffect(()=>{
    const el=canvas.current,scene=renderer.current;
    if(!el||!scene||!mesh||height==null)return;
    const {gl,resources,hasTexture}=scene;
    const draw=()=>{
      const rect=el.getBoundingClientRect(),scale=Math.min(window.devicePixelRatio||1,1.75);
      const w=Math.max(1,Math.round(rect.width*scale)),h=Math.max(1,Math.round(rect.height*scale));
      if(el.width!==w||el.height!==h){el.width=w;el.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      gl.useProgram(resources.program);
      const program=resources.program;
      gl.bindBuffer(gl.ARRAY_BUFFER,resources.vertices);
      const stride=6*4;
      const bind=(name:string,count:number,index:number)=>{
        const loc=gl.getAttribLocation(program,name);if(loc<0)return;
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,stride,index*4);
      };
      bind('aPosition',3,0);bind('aUv',2,3);bind('aLight',1,5);
      gl.uniform3f(gl.getUniformLocation(program,'uEye'),x,height-(mesh.heights[Math.floor(mesh.heights.length/2)]?.[Math.floor(mesh.heights[0].length/2)]??0)+1.7,z);
      gl.uniform1f(gl.getUniformLocation(program,'uHeading'),angle*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(program,'uPitch'),pitch*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(program,'uAspect'),w/h);
      gl.uniform1f(gl.getUniformLocation(program,'uHasTexture'),hasTexture?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,resources.texture);
      gl.uniform1i(gl.getUniformLocation(program,'uTexture'),0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,resources.indices);
      gl.drawElements(gl.TRIANGLES,resources.count,gl.UNSIGNED_SHORT,0);
    };
    const observer=new ResizeObserver(draw);observer.observe(el);draw();
    return()=>observer.disconnect();
  },[mesh,x,z,height,angle,pitch,textured]);
  const move=(forward:number,side:number)=>{
    if(!mesh||!base)return;
    const rad=angle*Math.PI/180;
    const dx=(Math.sin(rad)*forward+Math.cos(rad)*side)*5;
    const dz=(-Math.cos(rad)*forward+Math.sin(rad)*side)*5;
    const nx=x+dx,nz=z+dz;
    if(elevationAt(mesh,nx,nz)!=null)setOffset({x:nx-base.x,z:nz-base.z});
  };
  const onKey=(key:string)=>{
    if(key==='w'||key==='ArrowUp')move(1,0);
    if(key==='s'||key==='ArrowDown')move(-1,0);
    if(key==='a')move(0,-1);
    if(key==='d')move(0,1);
    if(key==='ArrowLeft')setYaw(v=>v-10);
    if(key==='ArrowRight')setYaw(v=>v+10);
  };
  return <section className="jezero-3d-visor" aria-label="Interactive Jezero DEM terrain scene">
    <canvas ref={canvas} tabIndex={0} aria-label="Drag to look, use W A S D to move" onKeyDown={e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){e.preventDefault();onKey(e.key)}}}
      onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY};setLook(true);e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{if(!pointer.current)return;const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;pointer.current={x:e.clientX,y:e.clientY};setYaw(v=>v+dx*.21);setPitch(v=>Math.max(-45,Math.min(45,v-dy*.16)))}}
      onPointerUp={()=>{pointer.current=null;setLook(false)}} onPointerCancel={()=>{pointer.current=null;setLook(false)}} />
    <div className="jezero-3d-top"><strong>JEZERO / 3D TERRAIN SIMULATION</strong><span>{Math.round(angle).toString().padStart(3,'0')}° · {textured?'ortho-textured DEM':'DEM mesh'}</span></div>
    <div className="jezero-3d-reticle" aria-hidden="true">+</div>
    <div className="jezero-3d-controls" aria-label="3D visor controls">
      <button type="button" onClick={()=>setYaw(v=>v-15)}>← Look</button>
      <button type="button" onClick={()=>move(1,0)}>Walk ↑</button>
      <button type="button" onClick={()=>move(-1,0)}>Walk ↓</button>
      <button type="button" onClick={()=>setYaw(v=>v+15)}>Look →</button>
      <button type="button" onClick={()=>{setOffset({x:0,z:0});setYaw(0);setPitch(0)}}>Reset view</button>
      <button type="button" onClick={()=>setShowHelp(v=>!v)} aria-expanded={showHelp}>?</button>
    </div>
    {showHelp&&<div className="jezero-3d-help">Drag or swipe to look around. Focus the terrain, then press W / S to walk forward/back and A / D to sidestep. Arrow keys turn or move. These steps move a virtual camera only; they do not change your actual navigation position.</div>}
    <div className="jezero-3d-caption" role="status">{problem||(!mesh?'Loading Jezero elevation mesh…':height==null?'This position is outside the available terrain model.':'Terrain heights come from the supplied Jezero DEM. Surface shading uses the supplied orbital preview; this is not a rover photograph.')} {route?'Route position follows the navigation simulator; free-look offsets are visual only.':''}</div>
    <span className="jezero-3d-hint">{look?'Looking around…':'Drag to look · W A S D to move · ? for help'}</span>
  </section>;
}
