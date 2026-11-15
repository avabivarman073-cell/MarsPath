import {OpeningVideo} from '../components/OpeningVideo';

/** Match the initial video overlay even for direct /tour navigation. */
export function TourPage({onSkip,onDone}:{onSkip:()=>void;onDone:()=>void}){
 return <main id="main-content" className="tour-page" tabIndex={-1}>
  <OpeningVideo open onSkip={onSkip} onGuidedTour={onDone}/>
 </main>;
}
