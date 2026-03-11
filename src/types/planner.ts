// Planner now captures production targets and actual production per SKU
export interface SkuRow {
  id: string;
  sku: string;
  product: string;
  productionTarget: number;
  realProduction: number;
  batchNumber: string;
  blenderSize: number;
  weightPerUnit: number;
  isNewProduct?: boolean;  // Flag to save new product to catalog
  isFoundInDb?: boolean;   // Flag to track if SKU was found in database
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
  productionTarget: 0,
  realProduction: 0,
  batchNumber: '',
  blenderSize: 0,
  weightPerUnit: 0,
});
