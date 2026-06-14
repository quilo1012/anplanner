import { QualitySeverity } from '@/types/quality';

export const SEVERITY_OPTIONS: { value: QualitySeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// Scale: Low = blue, Medium = yellow, High = orange, Critical = red
export function severityBadgeClass(sev: QualitySeverity | null | undefined): string {
  switch (sev) {
    case 'low':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400';
    case 'high':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-400 font-bold';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function severityLabel(sev: QualitySeverity | null | undefined): string {
  if (!sev) return '—';
  return sev.charAt(0).toUpperCase() + sev.slice(1);
}
