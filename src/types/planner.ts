// Planner is for PLANNING ONLY - no production quantities
export interface SkuRow {
  id: string;
  sku: string;
  product: string;
}

export interface PlannerFormData {
  date: string;
  shift: 'DAY' | 'NIGHT';
  productionLine: string;
  lineLeader: string;
  skuRows: SkuRow[];
  observations: string;
}

export const createEmptySkuRow = (): SkuRow => ({
  id: `sku-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sku: '',
  product: '',
});
