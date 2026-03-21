import { describe, test, expect } from 'bun:test';
import { compareVersion } from '../lib/semver.js';

describe('compareVersion', () => {
  test('equal versions return 0', () => {
    expect(compareVersion('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersion('0.16.0', '0.16.0')).toBe(0);
  });

  test('greater version returns 1', () => {
    expect(compareVersion('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersion('0.17.0', '0.16.0')).toBe(1);
    expect(compareVersion('0.16.1', '0.16.0')).toBe(1);
  });

  test('lesser version returns -1', () => {
    expect(compareVersion('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersion('0.15.0', '0.16.0')).toBe(-1);
  });

  test('handles different segment counts', () => {
    expect(compareVersion('1.0', '1.0.0')).toBe(0);
    expect(compareVersion('1.0.1', '1.0')).toBe(1);
  });
});
