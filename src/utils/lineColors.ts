/**
 * Centralized filler line color mappings.
 * Uses CSS variables defined in index.css (--filler-1 through --filler-6)
 * and Tailwind classes from tailwind.config.ts (filler.1 through filler.6).
 *
 * Use these helpers everywhere a production line needs color-coding:
 * Dashboard cards, History tables, Daily Summary, charts, etc.
 */

/** Tailwind border-left + gradient classes for card/row styling */
export const LINE_BORDER_CLASSES: Record<string, string> = {
  'Filler Line 1': 'border-l-filler-1 bg-gradient-to-r from-filler-1/5 to-transparent',
  'Filler Line 2': 'border-l-filler-2 bg-gradient-to-r from-filler-2/5 to-transparent',
  'Filler Line 3': 'border-l-filler-3 bg-gradient-to-r from-filler-3/5 to-transparent',
  'Filler Line 4': 'border-l-filler-4 bg-gradient-to-r from-filler-4/5 to-transparent',
  'Filler Line 5': 'border-l-filler-5 bg-gradient-to-r from-filler-5/5 to-transparent',
  'Filler Line 6': 'border-l-filler-6 bg-gradient-to-r from-filler-6/5 to-transparent',
};

/** Tailwind background classes for header badges */
export const LINE_HEADER_CLASSES: Record<string, string> = {
  'Filler Line 1': 'bg-filler-1',
  'Filler Line 2': 'bg-filler-2',
  'Filler Line 3': 'bg-filler-3',
  'Filler Line 4': 'bg-filler-4',
  'Filler Line 5': 'bg-filler-5',
  'Filler Line 6': 'bg-filler-6',
};

/** HSL CSS variable references for use in Recharts / inline styles */
export const LINE_CHART_COLORS: Record<string, string> = {
  'Filler Line 1': 'hsl(var(--filler-1))',
  'Filler Line 2': 'hsl(var(--filler-2))',
  'Filler Line 3': 'hsl(var(--filler-3))',
  'Filler Line 4': 'hsl(var(--filler-4))',
  'Filler Line 5': 'hsl(var(--filler-5))',
  'Filler Line 6': 'hsl(var(--filler-6))',
};

/** Default fallback color for unknown lines */
export const DEFAULT_LINE_BORDER = 'border-l-industrial-blue bg-gradient-to-r from-industrial-blue/5 to-transparent';
export const DEFAULT_LINE_HEADER = 'bg-industrial-blue';
export const DEFAULT_LINE_CHART_COLOR = 'hsl(var(--industrial-blue))';

export function getLineBorderClass(lineName: string): string {
  return LINE_BORDER_CLASSES[lineName] || DEFAULT_LINE_BORDER;
}

export function getLineHeaderClass(lineName: string): string {
  return LINE_HEADER_CLASSES[lineName] || DEFAULT_LINE_HEADER;
}

export function getLineChartColor(lineName: string): string {
  return LINE_CHART_COLORS[lineName] || DEFAULT_LINE_CHART_COLOR;
}
