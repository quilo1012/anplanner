/**
 * Natural sort comparator for production line names.
 * Extracts prefix and number, sorts by prefix first then numerically.
 * e.g. "Line 1" < "Line 2" < "Line 10" < "Filler Line 1"
 */
function parseLine(name: string): { prefix: string; num: number } {
  const match = name.match(/^(.+?)\s*(\d+)$/);
  if (match) {
    return { prefix: match[1].trim().toLowerCase(), num: parseInt(match[2], 10) };
  }
  return { prefix: name.toLowerCase(), num: 0 };
}

export function naturalLineSort(a: string, b: string): number {
  const pa = parseLine(a);
  const pb = parseLine(b);
  if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
  return pa.num - pb.num;
}
