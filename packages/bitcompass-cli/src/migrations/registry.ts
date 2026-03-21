import type { Migration } from './types.js';

// Ordered oldest-first. New migrations are appended.
export const migrations: Migration[] = [];
