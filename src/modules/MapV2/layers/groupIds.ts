/**
 * The four layer groups from the component-architecture doc — shared
 * between the modules that declare `groupId` and MapCanvas's
 * registerGroup() calls, so neither side can drift from the other.
 */
export const GROUP_ID = {
  MEASUREMENT: 'measurement',
  OVERLAYS: 'overlays',
  FACTS: 'facts',
  PREVIEW: 'preview',
} as const;

export type GroupId = (typeof GROUP_ID)[keyof typeof GROUP_ID];
