import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

type Rgb = [number, number, number];

/**
 * Renders text with a gradient between two RGB colors.
 */
export const gradient = (text: string, start: Rgb, end: Rgb): string =>
  [...text]
    .map((char, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 1;
      const [r1, g1, b1] = start;
      const [r2, g2, b2] = end;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return chalk.rgb(r, g, b)(char);
    })
    .join('');

/**
 * Glow effect: gradient that peaks in the middle (bright center, dimmer edges).
 */
export const glow = (text: string, baseColor: Rgb): string =>
  [...text]
    .map((char, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 1;
      const peak = 1 - 4 * (t - 0.5) * (t - 0.5);
      const mult = 0.4 + 0.6 * Math.max(0, peak);
      const [r, g, b] = baseColor;
      const R = Math.round(r * mult);
      const G = Math.round(g * mult);
      const B = Math.round(b * mult);
      return chalk.rgb(R, G, B)(char);
    })
    .join('');

const cyan: Rgb = [0, 212, 255];
const magenta: Rgb = [255, 64, 200];
const glowColor: Rgb = [255, 120, 255];

const PREFIX = 'made by ';
const AUTHOR = '@davide97g';
const GITHUB_URL = 'https://github.com/davide97g/';

/** OSC 8 hyperlink for supported terminals. */
const link = (url: string, text: string): string =>
  `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prints the same version + "made by" banner as postinstall (for bitcompass init).
 * Reads version from package.json next to dist/.
 */
export const printBanner = async (): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
  const version = pkg.version ?? '0.0.0';

  const out = process.stdout;
  const isTty = out.isTTY;
  const frames = 6;
  const frameMs = 80;

  out.write('\n');
  out.write(gradient(`version ${version}`, cyan, magenta) + '\n');

  if (!isTty) {
    out.write(PREFIX + link(GITHUB_URL, glow(AUTHOR, glowColor)) + '\n');
    out.write('\n');
    return;
  }

  for (let f = 0; f < frames; f++) {
    const t = f / (frames - 1);
    const brightness = 0.3 + 0.7 * (1 - Math.cos(t * Math.PI));
    const styledAuthor = [...AUTHOR]
      .map((char, i) => {
        const ti = AUTHOR.length > 1 ? i / (AUTHOR.length - 1) : 1;
        const peak = 1 - 4 * (ti - 0.5) * (ti - 0.5);
        const mult = (0.4 + 0.6 * Math.max(0, peak)) * brightness;
        const [r, g, b] = glowColor;
        return chalk.rgb(
          Math.round(r * Math.min(1, mult)),
          Math.round(g * Math.min(1, mult)),
          Math.round(b * Math.min(1, mult))
        )(char);
      })
      .join('');
    const line = PREFIX + link(GITHUB_URL, styledAuthor);
    out.write('\r\x1b[K' + line);
    await sleep(frameMs);
  }
  const finalLine = PREFIX + link(GITHUB_URL, glow(AUTHOR, glowColor));
  out.write('\r\x1b[K' + finalLine + '\n');
  out.write('\n');
};
