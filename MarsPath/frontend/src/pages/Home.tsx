import type {Page, MissionId} from '../types';
import {Icon, PrimaryButton} from '../components/ui';
import MarsGlobe from '../MarsGlobe';

/**
 * Orbital rings projected in 3D around a spherical Mars.
 * A segment is hidden only when it lies BEHIND the visible Mars surface.
 * On the near side, the ring is visible in FRONT of Mars; on the far side,
 * its central section disappears while the outside arc stays visible.
 */
const ORBIT_CENTER = 300;
const MARS_RADIUS = 220;

type OrbitDefinition = {
  id: string;
  radius: number;
  tilt: number;
  yaw: number;
  roll: number;
  dashed?: boolean;
};

const ORBITS: OrbitDefinition[] = [
  {id: 'gold', radius: 302, tilt: 62, yaw: 12, roll: -25},
  {id: 'blue', radius: 309, tilt: 68, yaw: -18, roll: 35},
  {id: 'soft', radius: 330, tilt: 74, yaw: 22, roll: -7, dashed: true},
];

function projectOrbit(orbit: OrbitDefinition) {
  const rad = Math.PI / 180;
  const tx = orbit.tilt * rad;
  const ty = orbit.yaw * rad;
  const rz = orbit.roll * rad;

  const sinX = Math.sin(tx), cosX = Math.cos(tx);
  const sinY = Math.sin(ty), cosY = Math.cos(ty);
  const sinZ = Math.sin(rz), cosZ = Math.cos(rz);

  const getPoint = (theta: number) => {
    const x0 = orbit.radius * Math.cos(theta);
    const y0 = orbit.radius * Math.sin(theta);

    const y1 = y0 * cosX;
    const z1 = y0 * sinX;

    const x2 = x0 * cosY + z1 * sinY;
    const z2 = -x0 * sinY + z1 * cosY;

    const x = x2 * cosZ - y1 * sinZ;
    const y = x2 * sinZ + y1 * cosZ;

    const radiusSquared = x * x + y * y;
    const surfaceZ = Math.sqrt(
      Math.max(0, MARS_RADIUS * MARS_RADIUS - radiusSquared)
    );

    return {
      x: ORBIT_CENTER + x,
      y: ORBIT_CENTER + y,
      theta,
      visible:
        radiusSquared >= MARS_RADIUS * MARS_RADIUS ||
        z2 >= surfaceZ,
    };
  };

  // Refine the point where the orbit meets Mars's edge.
  const findBoundary = (
    start: number,
    end: number,
    startVisible: boolean
  ) => {
    let low = start;
    let high = end;

    for (let i = 0; i < 32; i++) {
      const middle = (low + high) / 2;

      if (getPoint(middle).visible === startVisible) {
        low = middle;
      } else {
        high = middle;
      }
    }

    return getPoint((low + high) / 2);
  };

  const coordinates = (point: {x: number; y: number}) =>
    `${point.x.toFixed(4)} ${point.y.toFixed(4)}`;

  const paths: string[] = [];
  const dots: Array<{x: number; y: number}> = [];
  const sampleCount = 1440;

  let previous = getPoint(0);
  let current = previous.visible
    ? `M ${coordinates(previous)}`
    : '';

  for (let i = 1; i <= sampleCount; i++) {
    const point = getPoint((i / sampleCount) * Math.PI * 2);

    if (previous.visible && point.visible) {
      current += ` L ${coordinates(point)}`;
    } else if (previous.visible && !point.visible) {
      const boundary = findBoundary(
        previous.theta,
        point.theta,
        true
      );

      current += ` L ${coordinates(boundary)}`;
      paths.push(current);
      current = '';
    } else if (!previous.visible && point.visible) {
      const boundary = findBoundary(
        previous.theta,
        point.theta,
        false
      );

      current =
        `M ${coordinates(boundary)}` +
        ` L ${coordinates(point)}`;
    }

    previous = point;
  }

  if (current) paths.push(current);

  // Keep your decorative dots at their original positions.
  if (!orbit.dashed) {
    for (const index of [75, 275, 525]) {
      const point = getPoint((index / 720) * Math.PI * 2);

      if (point.visible) {
        dots.push({x: point.x, y: point.y});
      }
    }
  }

  return {paths, dots};
}

const VISIBLE_ORBITS = ORBITS.map(orbit => ({...orbit, ...projectOrbit(orbit)}));

function SurroundingOrbits() {
  return (
    <svg className="mars-depth-orbits" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
      <defs>
        <filter id="mars-orbit-point-glow" x="-250%" y="-250%" width="600%" height="600%">
          <feGaussianBlur stdDeviation="3.5" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {VISIBLE_ORBITS.map(orbit => (
        <g key={orbit.id} className={`mars-depth-ring mars-depth-ring-${orbit.id}`}>
          {orbit.paths.map((path, index) => <path key={index} d={path} />)}
          {orbit.dots.map((dot,index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r="3.5" filter="url(#mars-orbit-point-glow)" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Home({go}: {go: (p: Page) => void; onSelectMission: (id: MissionId) => void}) {
  return (
    <main id="main-content" tabIndex={-1} className="home-page">
      <section className="hero terminal-hero" aria-labelledby="hero-title">
        <div className="terminal-ambient" aria-hidden="true" />
        <div className="terminal-hero-layout">
          <div className="terminal-intro">
            <p className="terminal-kicker"><span className="terminal-pulse" /> SCIENCE-DRIVEN EXPLORATION</p>
            <h1 id="hero-title" style={{fontSize: 'clamp(4.25rem, 8.4vw, 10rem)'}}>
              Mars{' '}
              <span className="hero-subtitle" style={{fontSize: 'clamp(2rem, 4.25vw, 4.5rem)'}}>
                mapped for discovery
              </span>
            </h1>
            <p className="terminal-description">
              Explore scientific destinations, examine NASA-derived terrain data and plan a simulated
              Marswalk—all in one mission workspace.
            </p>
            <div className="terminal-actions">
              {/* This marker is required by the live guided tour. */}
              <span data-tour-target="explore" style={{display: 'inline-flex'}}>
                <PrimaryButton size="lg" onClick={() => go('discover')}>
                  Explore Mars <Icon name="arrow" size={19} />
                </PrimaryButton>
              </span>
            </div>
          </div>

          <div className="terminal-visual" aria-label="Draggable 3D Mars globe with decorative orbital paths">
            <div className="terminal-starfield" aria-hidden="true" />
            <div className="hero-globe-stack mars-reference-stack">
              <div className="hero-globe-wrap"><MarsGlobe /></div>
              <SurroundingOrbits />
            </div>
            <div className="terminal-visual-caption" aria-hidden="true">
              <strong>THE RED PLANET</strong>
              <span>NASA 3D Mars model · Drag to explore</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-about" id="about" aria-labelledby="about-mars-path">
        <div className="home-about-inner">
          <h2 id="about-mars-path">About MarsPath</h2>
          <p>
            MarsPath is a NASA Space Apps research prototype by Team Orbit Guardians.
            It brings together NASA-derived imagery, scientific destinations and terrain-aware
            route comparisons to help visitors plan and simulate Marswalks.
          </p>
          <p className="home-about-note">
            Educational research and simulation only — not operational astronaut navigation or safety guidance.
          </p>
        </div>
      </section>
    </main>
  );
}
