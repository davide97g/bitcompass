import ora, { type Ora, type Options } from 'ora';

/**
 * Logo-derived spinner frames for BitCompass CLI.
 * SVG logo is a curved "C" (Compass); we use a rotating quarter-circle + "C" glyph
 * for a minimal, branded terminal spinner.
 */
const LOGO_GLYPH = 'C';

export const BITCOMPASS_SPINNER = {
  interval: 120,
  frames: [
    `◐ ${LOGO_GLYPH}`,
    `◓ ${LOGO_GLYPH}`,
    `◑ ${LOGO_GLYPH}`,
    `◒ ${LOGO_GLYPH}`,
  ],
};

/**
 * Creates an ora spinner with the BitCompass logo frames and optional text.
 * Use .start() when ready to show, then .succeed() / .fail() / .stop() as usual.
 */
export const createSpinner = (text: string, options?: Omit<Options, 'text' | 'spinner'>): Ora => {
  return ora({
    text,
    spinner: BITCOMPASS_SPINNER,
    ...options,
  }).start();
};
