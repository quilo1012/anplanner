export type ShiftType = 'Day' | 'Night';

export type DowntimeReason = 
  | 'Maquinário quebrado'
  | 'Falta de matéria-prima'
  | 'Espera de bateria'
  | 'Setup'
  | 'Outros';

export interface Downtime {
  id: string;
  reason: DowntimeReason;
  duration: number; // in minutes
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
  'Maquinário quebrado',
  'Falta de matéria-prima',
  'Espera de bateria',
  'Setup',
  'Outros'
];
