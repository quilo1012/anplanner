/**
 * Normalize a SKU string for consistent storage and lookup.
 * - Trims whitespace
 * - Uppercases
 * - Strips trailing batch suffix (e.g. "-B1", " - B2")
 * - Collapses internal whitespace
 */
export function normalizeSku(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
  // Strip trailing batch suffix like "-B1", " B2", " - B3"
  return s.replace(/[\s-]+B\d+$/i, '').trim();
}

/** Returns true if the SKU is non-empty and reasonably formatted. */
export function isValidSku(sku: string): boolean {
  if (!sku) return false;
  if (sku.length > 64) return false;
  // Allow letters, digits, dashes, underscores, dots, slashes, spaces, plus
  return /^[A-Z0-9][A-Z0-9 _\-./+]*$/i.test(sku);
}
