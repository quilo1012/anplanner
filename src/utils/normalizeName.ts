/**
 * Canonical normalization for person-name comparisons (leaders, requesters, etc.).
 * Used to keep the filtering of `requester_name`, `line_leader`, and the logged-in
 * user's name (from AuthContext) consistent across the app — e.g. between the
 * Leader Quality Board and the Open Maintenance Tickets widget.
 *
 * Rule: trim outer whitespace, collapse internal whitespace, lowercase.
 * Treat null/undefined as empty string.
 */
export function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Strict equality of two names after normalization. Empty strings never match. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length > 0 && na === nb;
}
