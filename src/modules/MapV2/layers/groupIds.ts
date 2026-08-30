/**
 * The layer groups from the component-architecture doc — shared between the
 * modules that declare `groupId` and MapCanvas's registerGroup() calls, so
 * neither side can drift from the other.
 */
export const GROUP_ID = {
  MEASUREMENT: 'measurement',
  OVERLAYS: 'overlays',
  FACTS: 'facts',
  /** The wizard's own live composing aids (WizardPointsModule) — deliberately
   * its own group, not MEASUREMENT (which MapCanvas hides for the whole time
   * a wizard/answer-sheet is open, so the wizard's own feedback about the
   * points it just resolved would vanish right along with it) and not FACTS
   * (which the FactsChip eye toggle can hide independently of any wizard
   * being open at all). Nothing toggles this group off today. */
  WIZARD_AIDS: 'wizard-aids',
  /** Live player-location pings (PlayerLocationsModule) — its own group so
   * it can be toggled independently of Overlays/Facts, same reasoning as
   * every other capability having its own group. */
  PLAYER_LOCATIONS: 'player-locations',
} as const;

export type GroupId = (typeof GROUP_ID)[keyof typeof GROUP_ID];
