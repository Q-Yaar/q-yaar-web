/**
 * Turns a FactsV2-shaped fact (op_type/op_meta — see
 * src/modules/MapV2/factsV2/factTypes.ts's FactDto) into a friendly title +
 * sentence for this (legacy) Facts page, so a player sees "The hider is
 * north of the marked point" instead of "POINT_SPLIT" and a JSON dump.
 * Nothing here talks to the backend — it's a pure formatter over whatever
 * factV2Converter.ts already read off a real fact.
 */
import { Answer, FactDto, OPPOSITE, OpType, ResolvedLatLon } from '../MapV2/factsV2/factTypes';

const OP_TYPE_TITLE: Record<OpType, string> = {
  POINT_BUFFER_INSIDE: 'Distance check',
  POLYGON_INSIDE: 'Zone check',
  LINE_BUFFER_INSIDE: 'Distance from line',
  LINE_POINT_BUFFER_INSIDE: 'Line comparison',
  POINT_POINT_BUFFER_INSIDE: 'Point comparison',
  POINT_SPLIT: 'Direction check',
  TWO_POINT_BISECTOR: 'Hotter or colder',
};

const ANSWER_WORD: Record<Answer, string> = {
  INSIDE: 'inside', OUTSIDE: 'outside',
  NORTH: 'north', SOUTH: 'south', EAST: 'east', WEST: 'west',
  HOTTER: 'hotter', COLDER: 'colder',
};

const formatDistance = (metres: number): string => (
  metres >= 1000 ? `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)} km` : `${metres} m`
);

/** A registry key (e.g. "BLR_EAST_CORP") humanized without needing the
 * actual registry data, which this page has no access to — "Blr East
 * Corp" reads worse than "Bengaluru East City Corporation" but is still
 * far friendlier than the raw key. */
const humanizeKey = (key: string): string => key
  .replace(/_/g, ' ')
  .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const describePoint = (point: unknown, fallback: string): string => {
  const p = point as ResolvedLatLon | undefined;
  if (!p) return fallback;
  if (p.name) return p.name;
  if (p.source === 'ASKER_LOCATION') return "the asker's location";
  return fallback;
};

export function factV2Title(fact: FactDto): string {
  return OP_TYPE_TITLE[fact.fact_info.op_type] ?? 'Location fact';
}

export function factV2Description(fact: FactDto): string {
  const { op_type, op_meta } = fact.fact_info;
  const assertedAnswer = op_meta.assertedAnswer as Answer;
  const value = op_meta.value as boolean;
  const confirmedAnswer = value ? assertedAnswer : OPPOSITE[assertedAnswer];

  switch (op_type) {
    case 'POINT_BUFFER_INSIDE': {
      const point = describePoint(op_meta.point, 'the marked point');
      const radius = formatDistance(op_meta.radius as number);
      return confirmedAnswer === 'INSIDE'
        ? `The hider is within ${radius} of ${point}.`
        : `The hider is more than ${radius} from ${point}.`;
    }
    case 'POLYGON_INSIDE': {
      const zone = humanizeKey(op_meta.polygon as string);
      return confirmedAnswer === 'INSIDE'
        ? `The hider is inside ${zone}.`
        : `The hider is outside ${zone}.`;
    }
    case 'LINE_BUFFER_INSIDE': {
      const line = humanizeKey(op_meta.line as string);
      const distance = formatDistance(op_meta.distance as number);
      return confirmedAnswer === 'INSIDE'
        ? `The hider is within ${distance} of ${line}.`
        : `The hider is more than ${distance} from ${line}.`;
    }
    case 'LINE_POINT_BUFFER_INSIDE': {
      const line = humanizeKey(op_meta.line as string);
      const point = describePoint(op_meta.point, 'the asker');
      return confirmedAnswer === 'INSIDE'
        ? `The hider is closer to ${line} than ${point} is.`
        : `The hider is further from ${line} than ${point} is.`;
    }
    case 'POINT_POINT_BUFFER_INSIDE': {
      const anchor = describePoint(op_meta.anchor, 'the first point');
      const point = describePoint(op_meta.point, 'the second point');
      return confirmedAnswer === 'INSIDE'
        ? `The hider is closer to ${anchor} than to ${point}.`
        : `The hider is closer to ${point} than to ${anchor}.`;
    }
    case 'POINT_SPLIT': {
      const point = describePoint(op_meta.point, 'the marked point');
      return `The hider is ${ANSWER_WORD[confirmedAnswer]} of ${point}.`;
    }
    case 'TWO_POINT_BISECTOR': {
      const from = describePoint(op_meta.point, 'the first point');
      const to = describePoint(op_meta.pointFinal, 'the second point');
      return confirmedAnswer === 'HOTTER'
        ? `The hider is closer to ${to} than to ${from}.`
        : `The hider is closer to ${from} than to ${to}.`;
    }
    default:
      return 'The hider confirmed a fact about their location.';
  }
}
