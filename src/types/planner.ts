export interface SkuRow {
  id: string;
  sku: string;
  product: string;
  productionTarget: number;
  realProduction: number;
}

export interface PlannerFormData {
  date: string;
  shift: 'DAY' | 'NIGHT';
  productionLine: string;
  lineLeader: string;
  skuRows: SkuRow[];
  observations: string;
  staffPlanned: number;
  staffActual: number;
}

export const createEmptySkuRow = (): SkuRow => ({
  id: `sku-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sku: '',
  product: '',
  productionTarget: 0,
  realProduction: 0,
});
