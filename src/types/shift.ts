import { StructuredDowntime, DowntimeCategory, DOWNTIME_CATEGORIES, DOWNTIME_REASONS_BY_CATEGORY } from './downtime';

export type ShiftType = 'Day' | 'Night';

// Legacy downtime type (kept for backward compatibility)
export type DowntimeReason = 
  | 'machine_breakdown' 
  | 'lack_of_material' 
  | 'battery_waiting' 
  | 'setup' 
  | 'other';

export const DOWNTIME_REASON_LABELS: Record<DowntimeReason, string> = {
  machine_breakdown: 'Machine Breakdown',
  lack_of_material: 'Lack of Raw Material',
  battery_waiting: 'Battery Waiting',
  setup: 'Setup',
  other: 'Other',
};

export interface Downtime {
  id: string;
  reason: DowntimeReason;
  duration: number;
  notes?: string;
}

export interface ShiftReport {
  id: string;
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  product: string;
  sku: string;
  productionTarget: number;
  realProduction: number;
  performance: number;
  observations: string;
  downtimes: Downtime[];
  structuredDowntimes?: StructuredDowntime[];
  totalDowntime: number;
  monitoringPhoto?: string;
  photoFilename?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftFormData {
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  product: string;
  sku: string;
  productionTarget: number;
  realProduction: number;
  observations: string;
  downtimes: Downtime[];
  structuredDowntimes?: StructuredDowntime[];
  monitoringPhoto?: string;
  photoFilename?: string;
}

export const DOWNTIME_REASONS: DowntimeReason[] = [
  'machine_breakdown',
  'lack_of_material',
  'battery_waiting',
  'setup',
  'other'
];

export type { StructuredDowntime, DowntimeCategory };
export { DOWNTIME_CATEGORIES, DOWNTIME_REASONS_BY_CATEGORY };
