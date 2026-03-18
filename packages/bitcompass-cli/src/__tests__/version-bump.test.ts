/**
 * Unit tests for version bump utility.
 */

import { describe, test, expect } from 'bun:test';
import { bumpRuleVersionMajor } from '../lib/version-bump.js';

describe('bumpRuleVersionMajor', () => {
  test('bumps major version', () => {
    expect(bumpRuleVersionMajor('1.0.0')).toBe('2.0.0');
    expect(bumpRuleVersionMajor('3.2.1')).toBe('4.0.0');
    expect(bumpRuleVersionMajor('0.0.1')).toBe('1.0.0');
  });

  test('returns 1.0.0 for null/undefined/empty', () => {
    expect(bumpRuleVersionMajor(null)).toBe('1.0.0');
    expect(bumpRuleVersionMajor(undefined)).toBe('1.0.0');
    expect(bumpRuleVersionMajor('')).toBe('1.0.0');
    expect(bumpRuleVersionMajor('  ')).toBe('1.0.0');
  });

  test('returns 1.0.0 for invalid versions', () => {
    expect(bumpRuleVersionMajor('abc')).toBe('1.0.0');
    expect(bumpRuleVersionMajor('not-a-version')).toBe('1.0.0');
  });

  test('handles single number versions', () => {
    expect(bumpRuleVersionMajor('5')).toBe('6.0.0');
  });
});
