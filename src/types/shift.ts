export type ShiftType = 'Day' | 'Night';

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
  duration: number; // in minutes
  notes?: string;
}

export interface ShiftReport {
  id: string;
  date: string; // YYYY-MM-DD format
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  product: string;
  sku: string;
  productionTarget: number;
  realProduction: number;
  performance: number; // percentage
  observations: string;
  downtimes: Downtime[];
  totalDowntime: number; // total minutes
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
}

export const DOWNTIME_REASONS: DowntimeReason[] = [
  'machine_breakdown',
  'lack_of_material',
  'battery_waiting',
  'setup',
  'other'
];
