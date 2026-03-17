type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Returns an array of { char, color } pairs for gradient-colored text.
 * Each `color` is a hex string usable in Ink's <Text color="..."> prop.
 */
export function gradientChars(
  text: string,
  startHex: string,
  endHex: string
): Array<{ char: string; color: string }> {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return [...text].map((char, i) => {
    const t = text.length > 1 ? i / (text.length - 1) : 1;
    const r = Math.round(start[0] + (end[0] - start[0]) * t);
    const g = Math.round(start[1] + (end[1] - start[1]) * t);
    const b = Math.round(start[2] + (end[2] - start[2]) * t);
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return { char, color };
  });
}
