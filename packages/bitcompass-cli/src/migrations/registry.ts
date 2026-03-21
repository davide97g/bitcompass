import type { Migration } from './types.js';
import { migration as v0_16_0 } from './v0.16.0.js';

// Ordered oldest-first. New migrations are appended.
export const migrations: Migration[] = [
  v0_16_0,
];
