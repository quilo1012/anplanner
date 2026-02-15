/**
 * Normalize production line names to standard format: "Filler Line X"
 */
export function normalizeLineName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Match pattern like "filler line 6", "Filler  Line  6", etc.
  const match = trimmed.match(/^filler\s+line\s+(\d+)$/i);
  if (match) {
    return `Filler Line ${match[1]}`;
  }

  // Title-case fallback for non-standard names
  return trimmed
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
