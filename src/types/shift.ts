// Backward compatibility layer - re-exports from production types
import { StructuredDowntime, DowntimeCategory } from './downtime';

export type ShiftType = 'DAY' | 'NIGHT';

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

// ShiftReport is now an alias for the legacy interface
// All new code should use ProductionSession from production.ts
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
  staffPlanned: number;
  staffActual: number;
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
  staffPlanned: number;
  staffActual: number;
}

export const DOWNTIME_REASONS: DowntimeReason[] = [
  'machine_breakdown',
  'lack_of_material',
  'battery_waiting',
  'setup',
  'other'
];

export const SHIFT_TYPES: ShiftType[] = ['DAY', 'NIGHT'];

export type { StructuredDowntime, DowntimeCategory };
