/**
 * Normalize production line names to standard format: "Filler Line X"
 */
export function normalizeLineName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Match pattern like "filler line 6", "Filler  Line  6", etc.
  const fillerMatch = trimmed.match(/^filler\s+line\s+(\d+)$/i);
  if (fillerMatch) {
    return `Filler Line ${fillerMatch[1]}`;
  }

  // Match "Line 1", "line 3", "LINE  6" → "Filler Line X"
  const lineMatch = trimmed.match(/^line\s+(\d+)$/i);
  if (lineMatch) {
    return `Filler Line ${lineMatch[1]}`;
  }

  // Title-case fallback for non-standard names
  return trimmed
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
