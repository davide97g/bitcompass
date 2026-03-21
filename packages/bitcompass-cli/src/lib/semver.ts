/**
 * Compares two semver strings (major.minor.patch numeric ordering).
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 * Pre-release tags and build metadata are not supported.
 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10));
  const pb = b.split('.').map((s) => parseInt(s, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}
