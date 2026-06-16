/**
 * Map an Anplanner production line name to the corresponding Anmaisys line name.
 * Anmaisys only has Line 1-6 (no Tablet Line yet).
 * Returns null if no mapping exists.
 */
export function mapToAnmaisysLine(anplannerLine: string): string | null {
  const trimmed = (anplannerLine || '').trim();
  const m = trimmed.match(/^filler\s+line\s+([1-6])$/i);
  if (m) return `Line ${m[1]}`;
  // Already "Line N"?
  const m2 = trimmed.match(/^line\s+([1-6])$/i);
  if (m2) return `Line ${m2[1]}`;
  return null;
}
