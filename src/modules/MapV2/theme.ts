/**
 * A rough "Uber dark mode" look for the whole MapV2 surface: a near-black
 * basemap, near-black floating UI chrome, a single blue accent, white/gray
 * text. Map *data* layers (points, polygons, facts) pick their own
 * saturated colors so they read clearly against the dark basemap — see
 * each layer module for those — this file is for the basemap choice and
 * the UI chrome (panels, buttons, modals) shared across MapCanvas and its
 * components.
 */

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/** The floating TopBar's approximate rendered height (excluding the safe
 * area inset it also adds on top) — shared with anything else positioned
 * over the map that needs to sit below it (FactsChip, the pick-prompt
 * banner) and with useMapInstance's own top-right control offset, so none
 * of them drift out of sync with the header's actual size. */
export const MAP_HEADER_HEIGHT_PX = 56;

export const uberDark = {
  surface: '#141414',
  surfaceElevated: '#1f1f1f',
  border: 'rgba(255,255,255,0.14)',
  textPrimary: '#ffffff',
  textSecondary: '#9b9b9b',
  accent: '#276EF1',
  accentText: '#ffffff',
  danger: '#E11900',
  success: '#05944F',
  warning: '#FFC043',
} as const;
