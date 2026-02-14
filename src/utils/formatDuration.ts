/**
 * Format duration in minutes to a human-readable string.
 * - Under 60 min: "45 min"
 * - 60+ min: "1h 30min" or "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (remainingMin === 0) return `${hours}h`;
  return `${hours}h ${remainingMin}min`;
}
