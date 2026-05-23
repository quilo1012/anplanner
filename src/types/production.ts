import { StructuredDowntime } from './downtime';

export type ShiftType = 'DAY' | 'NIGHT';
export const SHIFT_TYPES: ShiftType[] = ['DAY', 'NIGHT'];

export interface ProductionItem {
  id: string;
  sku: string;
  productName: string;
  quantityTarget: number;
  quantityActual: number;
}

export interface ProductionSession {
  id: string;
  productionLine: string;
  date: string;
  shift: ShiftType;
  lineLeader: string;
  staffPlanned: number;
  staffActual: number;
  plannedQuantity: number;
  comments: string;
  monitoringPhoto?: string;
  photoFilename?: string;
  items: ProductionItem[];
  structuredDowntimes: StructuredDowntime[];
  // Computed
  totalProduction: number;
  totalDowntime: number;
  performance: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ProductionSessionFormData {
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  plannedQuantity: number;
  items: Array<{
    sku: string;
    productName: string;
    quantityTarget: number;
    quantityActual: number;
  }>;
  comments: string;
  structuredDowntimes?: StructuredDowntime[];
  monitoringPhoto?: string;
  photoFilename?: string;
  staffPlanned: number;
  staffActual: number;
}

export type { StructuredDowntime };
