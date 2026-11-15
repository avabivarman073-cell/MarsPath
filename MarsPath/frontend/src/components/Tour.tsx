import {useEffect, useRef, useState} from 'react';

const STEPS = [
  {
    title: 'Choose your mission',
    text: 'Choose terrain exploration, water-ice research or past habitability to see the available scientific destinations.'
  },
  {
    title: 'Inspect Mars data',
    text: 'Explore NASA-derived imagery, terrain measurements and science context. Available layers and coverage depend on the selected mission.'
  },
  {
    title: 'Plan and compare routes',
    text: 'Where routing data is available, generate and compare route options using a derived terrain-cost model. These are simulation results, not safety ratings.'
  },
  {
    title: 'Navigate and review',
    text: 'Try the simulated Marswalk, inspect the route and review a mission summary.'
  }
];

type ExperienceProps = {
  onSkip: () => void;
  onDone: () => void;
};

export function TourExperience({onSkip, onDone}: ExperienceProps) {
  const [step, setStep] = useState(0);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="tour-experience">
      <div className="tour-intro">
        <div className="tour-eyebrow-row">
          <span className="tour-eyebrow">MARSPATH / QUICK START</span>
          <button type="button" className="tour-skip-link" onClick={onSkip}>Skip tour ×</button>
        </div>
        <h2>Take a tour of MarsPath</h2>
        <p>Discover the science, route planning and simulated Marswalk experience.</p>
      </div>

      <div className="tour-video-shell">
        {videoAvailable ? (
          <video
            src="/media/marspath-tour.mp4"
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="MarsPath guided demonstration video"
            onError={() => setVideoAvailable(false)}
          >
            Your browser does not support HTML5 video.
          </video>
        ) : (
          <div className="tour-video-fallback" role="status">
            <span aria-hidden="true">▶</span>
            <strong>Guided demonstration</strong>
            <p>The video recording is not available yet. You can still explore the tour using the steps below.</p>
          </div>
        )}
      </div>

      <div className="tour-step-panel" aria-live="polite">
        <div className="tour-step-top">
          <span>STEP {step + 1} / {STEPS.length}</span>
          <span>{STEPS.map((_, i) => i === step ? '●' : '○').join(' ')}</span>
        </div>
        <h3>{STEPS[step].title}</h3>
        <p>{STEPS[step].text}</p>
      </div>

      <div className="tour-controls">
        <button type="button" className="btn btn-outline" onClick={onSkip}>Skip tour</button>
        <div className="tour-control-next">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="button" className="btn btn-primary" onClick={() => isLast ? onDone() : setStep(step + 1)}>
            {isLast ? 'Start exploring' : 'Next step'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tour({open, onClose}: {open: boolean; onClose: () => void}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="tour-dialog tour-video-dialog"
      aria-label="Welcome to MarsPath guided tour"
      onClose={onClose}
    >
      <TourExperience key={open ? 'visible' : 'hidden'} onSkip={onClose} onDone={onClose} />
    </dialog>
  );
}
