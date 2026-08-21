/**
 * Throwaway verification test: exercises the config-driven Measuring fact
 * builder against the user's real example data and asserts it produces the
 * correct target-centered circle (radius = seeker<->target distance in km,
 * hiderLocation derived from the accepted "further" answer).
 */
import { resolveFactBuilder } from '../config/factBuilder';
import { getFactBuilder } from '../config/questionCategories';
import type { AskedQuestion } from '../models/QnA';

// @turf/turf pulls in ESM-only deps that CRA's jest can't transform, so mock
// geoUtils with a haversine calculateDistance (same great-circle math turf
// uses) and let the resolver run for real. This validates the wiring and the
// numeric radius without loading turf.
jest.mock('../utils/geoUtils', () => {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const calculateDistance = (p1: number[], p2: number[]): number => {
    const [lon1, lat1] = p1;
    const [lon2, lat2] = p2;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return { calculateDistance };
});

describe('Measuring fact builder (verification)', () => {
  // Reconstructed from the user's fact + the source question.
  // location_points: [seeker, target], answer_meta.result = false (further).
  const question = {
    question_id: 'e8aa907d-aea9-4a93-ad79-812addea70a4',
    rendered_question: 'Compared to me, are you closer to or further from Marathahalli Bridge?',
    category: { category_name: 'Measuring' },
    question_meta: {
      location_points: [
        { lat: '12.961581181177438', lon: '77.73055282652943' }, // seeker
        { lat: '12.95700470014755', lon: '77.70238816738129' }, // target (Marathahalli Bridge)
      ],
    },
    fact_meta: {},
    // The auto-answer computed "further" (hider distance 3108m > seeker 3094m).
    answer_meta: { result: false, metadata: { text: 'Hiding: 3108.516518473554m, Seeking: 3094.133830213372m to target' } },
  } as unknown as AskedQuestion;

  it('has a factBuilder registered for Measuring', () => {
    expect(getFactBuilder('Measuring')).toBeDefined();
  });

  it('emits a target-centered draw-circle with the seeker<->target distance as radius', () => {
    const builder = getFactBuilder('Measuring')!;
    const { opType, opMeta } = resolveFactBuilder(builder, question);

    expect(opType).toBe('draw-circle');

    // Center = target = [lng, lat] of Marathahalli Bridge.
    expect(opMeta.points).toEqual([[77.70238816738129, 12.95700470014755]]);

    // Radius in km ~= seeker<->target distance. The auto-answer text reported
    // 3094.13 m for the seeker<->target (seeking) distance.
    const radiusKm = opMeta.radius as number;
    expect(radiusKm).toBeGreaterThan(3.09);
    expect(radiusKm).toBeLessThan(3.10);

    // Accepted result false (hider further) -> shade outside the circle.
    expect(opMeta.hiderLocation).toBe('outside');
  });

  it('shades inside when the accepted answer is "closer" (true)', () => {
    const closer = {
      ...question,
      answer_meta: { result: true, metadata: { text: 'closer' } },
    } as unknown as AskedQuestion;
    const builder = getFactBuilder('Measuring')!;
    const { opMeta } = resolveFactBuilder(builder, closer);
    expect(opMeta.hiderLocation).toBe('inside');
  });

  it('falls back to generic path (no factBuilder) for a category without one', () => {
    // Photo has no factBuilder.
    expect(getFactBuilder('Photo')).toBeUndefined();
  });
});
