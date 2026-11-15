import {useEffect, useState} from 'react';
import '../mission-stages.css';
import type {Candidate, MissionId, Page} from '../types';
import {MISSIONS} from '../types';
import {Icon, LabeledMetric, PageHeader, PrimaryButton, Status} from '../components/ui';
import {ScienceDetails} from '../components/ScienceDetails';
import {candidateNotice, missionExplanation, missionFacts, positionLabel, propertyText} from '../lib/candidates';

type Props = {
  go: (p: Page) => void;
  missionId: MissionId;
  setMissionId: (m: MissionId) => void;
  candidates: Candidate[];
  source: string;
  candidateId: string | null;
  selectCandidate: (c: Candidate) => void;
  loading: boolean;
};

function CandidateCard({c, selected, comparing, onSelect, tourTarget, onCompare, onDetails}: {
  c: Candidate; selected: boolean; comparing: boolean; onSelect: () => void; tourTarget?: string; onCompare: (on: boolean) => void; onDetails: () => void;
}) {
  const facts = missionFacts(c).slice(0, 3);
  return (
    <article className={`candidate-card ${selected ? 'selected' : ''}`}>
      <header>
        <h3>{c.name}</h3>
        <span className={`pill ${c.routingSupported ? 'pill-good' : 'pill-neutral'}`}>
          {c.routingSupported ? 'Route planning' : c.missionId === 'past-life-jezero' ? 'Regional routing' : 'Science only'}
        </span>
      </header>
      <p className="muted">{positionLabel(c)}</p>
      <dl className="fact-list">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="candidate-note">{candidateNotice(c)}</p>
      <label className="check">
        <input type="checkbox" checked={comparing} onChange={(e) => onCompare(e.target.checked)} />
        Add to comparison
      </label>
      <footer>
        <button type="button" className="btn btn-outline btn-sm" onClick={onDetails}>View details</button>
        <button type="button" data-tour-target={tourTarget} className={`btn btn-sm ${selected ? 'btn-selected' : 'btn-primary'}`} onClick={onSelect} aria-pressed={selected}>
          {selected ? 'Selected' : 'Select candidate'}
        </button>
      </footer>
    </article>
  );
}

export function Discover({go, missionId, setMissionId, candidates, source, candidateId, selectCandidate, loading}: Props) {
  // Mission sections A–D are four separate screens under /explore.
  // Query-string stages make each screen linkable and browser Back/Forward-friendly.
  type Stage = 'mission' | 'candidate' | 'compare' | 'confirm';
  const allStages: Stage[] = ['mission', 'candidate', 'compare', 'confirm'];
  const readStage = (): Stage => {
    const value = new URLSearchParams(window.location.search).get('stage');
    return allStages.includes(value as Stage) ? value as Stage : 'mission';
  };
  const [stage, setStage] = useState<Stage>(readStage);
  const showStage = (next: Stage) => {
    if(next === stage) return;
    const url = new URL(window.location.href);
    url.searchParams.set('stage', next);
    window.history.pushState({marsPath:true, stage:next}, '', url.pathname + url.search);
    setStage(next);
    window.scrollTo({top:0, behavior:'instant'});
  };
  useEffect(() => {
    const sync = () => setStage(readStage());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const mission = MISSIONS.find((m) => m.id === missionId)!;
  const compared = candidates.filter((c) => compareIds.includes(c.id));
  const selected = candidates.find((c) => c.id === candidateId) || null;
  const isRover = missionId === 'rover-navigation-jezero';
  const properties = Array.from(new Set(compared.flatMap((c) => Object.keys(c.properties))));

  return (
    <main id="main-content" tabIndex={-1} className="page-main">
      <nav className="mission-stage-nav" aria-label="Mission selection steps">
        {allStages.map((name, i) => (
          <span key={name} className={`mission-stage-pill ${stage === name ? 'current' : ''}`} aria-current={stage === name ? 'step' : undefined}>
            {String.fromCharCode(65 + i)} · {['Mission', 'Location', 'Compare', 'Confirm'][i]}
          </span>
        ))}
      </nav>
      {stage === 'mission' && <PageHeader title="Choose your mission">What would you like to investigate on Mars?</PageHeader>}
      {stage === 'candidate' && <PageHeader title="Choose a candidate location">Pick a destination for your mission.</PageHeader>}
      {stage === 'compare' && <PageHeader title="Compare candidates">Check the study areas before continuing.</PageHeader>}
      {stage === 'confirm' && <PageHeader title="Confirm your mission">Review your choices before opening Mars Explorer.</PageHeader>}

      {stage === 'mission' && <section aria-labelledby="mission-step">
        <h2 id="mission-step" className="step-heading"><span>A</span> Select a mission</h2>
        <div className="mission-cards">
          {MISSIONS.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`mission-card ${missionId === m.id ? 'active' : ''}`}
              aria-pressed={missionId === m.id}
              data-tour-target={m.id === 'rover-navigation-jezero' ? 'terrain' : undefined}
              onClick={() => { setMissionId(m.id); setCompareIds([]); setDetailsId(null); showStage('candidate'); }}
            >
              <span className="mission-card-icon"><Icon name={m.icon} size={26} /></span>
              <h3>{m.label}</h3>
              <span className="mission-card-region">{m.region} · {m.capability}</span>
              <p>{m.description}</p>
              <span className="mission-card-data">Data available: {m.science}</span>
            </button>
          ))}
        </div>
      </section>}

      {stage === 'candidate' && <section aria-labelledby="candidate-step">
        <h2 id="candidate-step" className="step-heading"><span>B</span> Choose a candidate location</h2>
        <p className="section-lead">{missionExplanation(missionId)}</p>
        {source === 'local' && <Status kind="warn">The backend is not running, so supplied local records are shown. Start the backend to enable route planning.</Status>}
        {loading ? (
          <div className="empty-state">Loading candidate locations…</div>
        ) : (
          <div className="candidate-grid">
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                c={c}
                selected={c.id === candidateId}
                comparing={compareIds.includes(c.id)}
                onSelect={() => { selectCandidate(c); showStage('compare'); }}
                tourTarget={c.id.toLowerCase().includes('jezero-a') || c.name.toLowerCase().replace(/\s+/g,'-') === 'jezero-a' ? 'jezero-a' : undefined}
                onCompare={(on) => setCompareIds((ids) => (on ? [...ids, c.id].slice(-3) : ids.filter((id) => id !== c.id)))}
                onDetails={() => setDetailsId(detailsId === c.id ? null : c.id)}
              />
            ))}
          </div>
        )}
        {detailsId && (
          <div className="detail-panel">
            <div className="detail-panel-head">
              <h3>Candidate details</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailsId(null)}>Close</button>
            </div>
            <ScienceDetails candidate={candidates.find((c) => c.id === detailsId) || null} />
          </div>
        )}
        <div className="mission-stage-actions">
          <button className="btn btn-outline" type="button" onClick={() => showStage('mission')}>← Back to missions</button>
        </div>
      </section>}

      {stage === 'compare' && <section aria-labelledby="compare-step">
        <h2 id="compare-step" className="step-heading"><span>C</span> Compare candidates</h2>
        {compared.length < 2 ? (
          <p className="muted">Tick &ldquo;Add to comparison&rdquo; on two or three candidates to compare their {mission.label.toLowerCase()} attributes side by side.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th scope="col">Attribute</th>{compared.map((c) => <th scope="col" key={c.id}>{c.name}</th>)}</tr>
              </thead>
              <tbody>
                {properties.map((key) => (
                  <tr key={key}>
                    <th scope="row">{key.replace(/_/g, ' ')}</th>
                    {compared.map((c) => <td key={c.id}>{propertyText(c, key)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mission-stage-actions">
          <button className="btn btn-outline" type="button" onClick={() => showStage('candidate')}>← Back to locations</button>
          <button className="btn btn-primary" type="button" data-tour-target="compare-next" onClick={() => showStage('confirm')}>Continue to confirmation →</button>
        </div>
      </section>}

      {stage === 'confirm' && <section aria-labelledby="confirm-step" className="confirm-card">
        <h2 id="confirm-step" className="step-heading"><span>D</span> Confirm and continue</h2>
        {selected ? (
          <dl className="summary-list">
            <div><dt>Mission</dt><dd>{mission.label}</dd></div>
            <div><dt>Candidate</dt><dd>{selected.name}</dd></div>
            <div><dt>Region</dt><dd>{mission.region}</dd></div>
            <div><dt>Objective</dt><dd>{mission.description}</dd></div>
            <div><dt>Route planning</dt><dd>{selected.routingSupported ? 'Available' : missionId === 'past-life-jezero' ? 'Regional model routes available with the backend' : 'Not available. Scientific exploration is still available.'}</dd></div>
          </dl>
        ) : (
          <p className="muted">
            Select a candidate above to continue.{isRover && ' You can also continue without one and choose any point on the local Jezero map.'}
          </p>
        )}
        <div className="action-row mission-stage-actions">
          <button className="btn btn-outline" type="button" onClick={() => showStage('compare')}>← Back to comparison</button>
          <span data-tour-target="continue">
            <PrimaryButton size="lg" disabled={!selected && !isRover} onClick={() => go('map')}>Continue to Mars Explorer</PrimaryButton>
          </span>
        </div>
      </section>}
    </main>
  );
}
