import type {Point} from './types';

/**
 * Jezero landmark routing DEMO anchors (5 m grid, 401x401).
 * Apart from the team's Butler reference cell, these point placements are
 * provisional interpretations of approximate verbal descriptions supplied by
 * the project team. They are NOT NASA-certified site coordinates, formation
 * boundaries, or surveyed points. Verify them against QGIS before calling any
 * generated route a route to the named feature itself.
 *
 * NASA sources below document the existence/context of the named features,
 * NOT the chosen grid anchor or its coordinate accuracy.
 */
export type JezeroLandmark = {
  id: string;
  name: string;
  point: Point;
  kind: 'historic-site' | 'geologic-area';
  accuracy: 'project-landing-reference' | 'provisional-model-waypoint';
  description: string;
  anchorExplanation: string;
  sourceUrl: string;
};

export const JEZERO_LANDMARKS: readonly JezeroLandmark[] = [
  {
    id: 'butler-landing', name: 'Octavia E. Butler Landing Site',
    point: {row: 200, col: 200}, kind: 'historic-site',
    accuracy: 'project-landing-reference',
    description: 'Perseverance landed in Jezero Crater on February 18, 2021.',
    anchorExplanation: 'The established MarsPath Butler start/reference grid cell (200, 200), not an independently re-surveyed landing fix. Choose a different start to route back here.',
    sourceUrl: 'https://science.nasa.gov/resource/welcome-to-octavia-e-butler-landing/',
  },
  {
    id: 'wright-brothers-field', name: 'Wright Brothers Field',
    point: {row: 194, col: 216}, kind: 'historic-site',
    accuracy: 'provisional-model-waypoint',
    description: 'The original Ingenuity flight demonstration airfield near the rover landing area.',
    anchorExplanation: 'Provisional ~85 m east-northeast of the team Butler reference, using the distance/direction supplied in the request. Not a verified field-center coordinate.',
    sourceUrl: 'https://science.nasa.gov/blog/aerial-scouting-of-raised-ridges-for-ingenuitys-flight-10/',
  },
  {
    id: 'maaz-formation', name: 'Máaz Formation',
    point: {row: 210, col: 230}, kind: 'geologic-area',
    accuracy: 'provisional-model-waypoint',
    description: 'Crater-floor geologic unit near the landing area, rather than one discrete point.',
    anchorExplanation: 'Illustrative eastern-side route waypoint ~160 m from the Butler reference. This is not a mapped Máaz boundary or a verified observation site.',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9683734/',
  },
  {
    id: 'seitah-formation', name: 'Séítah Formation',
    point: {row: 270, col: 115}, kind: 'geologic-area',
    accuracy: 'provisional-model-waypoint',
    description: 'Olivine-rich crater-floor geologic unit exposed west/southwest of the landing area.',
    anchorExplanation: 'Illustrative southwest route waypoint ~550 m from the Butler reference. Not a verified outcrop coordinate or a traced formation boundary.',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9683734/',
  },
  {
    id: 'artuby-ridge', name: 'Artuby Ridge',
    point: {row: 318, col: 95}, kind: 'geologic-area',
    accuracy: 'provisional-model-waypoint',
    description: 'Extended ridge/outcrop zone associated with the Máaz–Séítah contact.',
    anchorExplanation: 'Illustrative southwest route waypoint ~790 m from Butler. The ridge is elongated; this cell has not been matched to its mapped outline or to the rover traverse.',
    sourceUrl: 'https://ntrs.nasa.gov/api/citations/20230016438/downloads/Crumpler%20et%20al%202023%20JGR%20Planets%20Mapping%20of%20Jezero.pdf',
  },
  {
    id: 'van-zyl-overlook', name: 'Van Zyl Overlook',
    point: {row: 192, col: 193}, kind: 'historic-site',
    accuracy: 'provisional-model-waypoint',
    description: "Observation site used by Perseverance during Ingenuity's early flights.",
    anchorExplanation: 'Provisional ~53 m northwest of the Butler reference using the approximate distance/direction supplied. Not a verified rover observation position.',
    sourceUrl: 'https://science.nasa.gov/resource/van-zyl-overlook/',
  },
];

export function landmarkAtGridPoint(point: Point): JezeroLandmark | undefined {
  return JEZERO_LANDMARKS.find(item => item.point.row === point.row && item.point.col === point.col);
}
