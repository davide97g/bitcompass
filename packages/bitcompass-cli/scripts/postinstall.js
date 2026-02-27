#!/usr/bin/env node

import chalk from "chalk";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;

/**
 * Renders text with a gradient between two RGB colors.
 * @param {string} text
 * @param {[number, number, number]} start - [r, g, b] 0-255
 * @param {[number, number, number]} end - [r, g, b] 0-255
 * @returns {string}
 */
const gradient = (text, [r1, g1, b1], [r2, g2, b2]) =>
  [...text]
    .map((char, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 1;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return chalk.rgb(r, g, b)(char);
    })
    .join("");

/**
 * Glow effect: gradient that peaks in the middle (bright center, dimmer edges).
 * @param {string} text
 * @param {[number, number, number]} baseColor - [r, g, b] for the glow color
 * @returns {string}
 */
const glow = (text, [r, g, b]) =>
  [...text]
    .map((char, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 1;
      const peak = 1 - 4 * (t - 0.5) * (t - 0.5);
      const mult = 0.4 + 0.6 * Math.max(0, peak);
      const R = Math.round(r * mult);
      const G = Math.round(g * mult);
      const B = Math.round(b * mult);
      return chalk.rgb(R, G, B)(char);
    })
    .join("");

/**
 * Same as glow but with a brightness multiplier for animation (0–1).
 */
const glowWithBrightness = (text, [r, g, b], brightness) =>
  [...text]
    .map((char, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 1;
      const peak = 1 - 4 * (t - 0.5) * (t - 0.5);
      const mult = (0.4 + 0.6 * Math.max(0, peak)) * brightness;
      const R = Math.round(r * Math.min(1, mult));
      const G = Math.round(g * Math.min(1, mult));
      const B = Math.round(b * Math.min(1, mult));
      return chalk.rgb(R, G, B)(char);
    })
    .join("");

const cyan = [0, 212, 255];
const magenta = [255, 64, 200];
const glowColor = [255, 120, 255];

const PREFIX = "made by ";
const AUTHOR = "@davide97g";
const GITHUB_URL = "https://github.com/davide97g/";
const INIT_TIP =
  chalk.dim("Run ") + chalk.cyan("bitcompass init") + chalk.dim(" in your project to configure.");

/** Wraps text in OSC 8 hyperlink so it's clickable in supported terminals (VS Code, iTerm2, Windows Terminal). */
const link = (url, text) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** npm v7+ runs lifecycle scripts in background and suppresses stdout. Write to stderr so the message is visible during `npm i bitcompass -g`. */
const out = process.stderr;

const animateAuthorLine = async () => {
  const isTty = out.isTTY;
  const frames = 6;
  const frameMs = 80;

  if (!isTty) {
    out.write(PREFIX + link(GITHUB_URL, glow(AUTHOR, glowColor)) + "\n");
    return;
  }

  for (let f = 0; f < frames; f++) {
    const t = f / (frames - 1);
    const brightness = 0.3 + 0.7 * (1 - Math.cos(t * Math.PI));
    const styledAuthor = glowWithBrightness(AUTHOR, glowColor, brightness);
    const line = PREFIX + link(GITHUB_URL, styledAuthor);
    out.write("\r\x1b[K" + line);
    await sleep(frameMs);
  }
  const finalLine = PREFIX + link(GITHUB_URL, glow(AUTHOR, glowColor));
  out.write("\r\x1b[K" + finalLine + "\n");
};

out.write("\n");
out.write(gradient(`version ${version}`, cyan, magenta) + "\n");
await animateAuthorLine();
out.write(INIT_TIP + "\n");
out.write("\n");
