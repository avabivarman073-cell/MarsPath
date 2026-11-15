import {createElement, useState} from 'react';

type GuideName = 'Alex' | 'Sham';
type Props = {name: GuideName; facing?: number};

const MODELS: Record<GuideName, string> = {
  Alex: '/models/marspath-tour-guide.glb',
  Sham: '/models/marspath-sham-guide.glb',
};

/**
 * Fixed, upright three-quarter FRONT camera views.
 * Alex: camera 30 degrees to one side. Sham: camera 330 degrees to the other.
 * No auto-rotate, model orientation transform, animation, or camera controls.
 * If your particular model was authored back-to-front, adjust BASE_AZIMUTH
 * by 180; NEVER rotate around X or Z to fix front/back direction.
 */
const BASE_AZIMUTH = 0;
export function TourAvatar3D({name}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const azimuth = BASE_AZIMUTH + (name === 'Alex' ? 60 : 100);

  if (failed) return <div className="guided-avatar-fallback" role="img" aria-label={`${name} astronaut`}>👨‍🚀</div>;
  return (
    <div className="guided-avatar-stage" aria-label={`${name} astronaut`}>
      {!loaded && <span className="guided-avatar-loading">Loading…</span>}
      {createElement('model-viewer', {
        src: MODELS[name],
        alt: `${name}, 3D MarsPath astronaut`,
        loading: 'eager',
        'camera-orbit': `${azimuth}deg 80deg auto`,
        'field-of-view': '32deg',
        'disable-zoom': '',
        'disable-pan': '',
        'interaction-prompt': 'none',
        'shadow-intensity': '0.7',
        exposure: '1.15',
        onLoad: () => setLoaded(true),
        onError: () => setFailed(true),
        className: 'guided-avatar-model',
        style: {display: 'block', width: '100%', height: '100%', background: 'transparent'},
      })}
    </div>
  );
}
