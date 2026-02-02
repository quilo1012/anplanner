import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { ProductSearch } from './ProductSearch';

interface SkuRowFormProps {
  skuRows: SkuRow[];
  onChange: (rows: SkuRow[]) => void;
  canReview?: boolean;
  errors?: Record<string, string>;
}

export function SkuRowForm({ 
  skuRows, 
  onChange, 
  canReview = false,
  errors = {}
}: SkuRowFormProps) {
  const addSkuRow = () => {
    onChange([...skuRows, createEmptySkuRow()]);
  };

  const removeSkuRow = (id: string) => {
    onChange(skuRows.filter(row => row.id !== id));
  };

  const updateSkuRow = (
    id: string, 
    field: keyof SkuRow, 
    value: string | number
  ) => {
    onChange(
      skuRows.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleProductSelect = (rowId: string, sku: string, product?: { sku: string; name: string }) => {
    onChange(
      skuRows.map(row => 
        row.id === rowId 
          ? { ...row, sku, product: product?.name || row.product } 
          : row
      )
    );
  };

  const totalTarget = skuRows.reduce((sum, row) => sum + row.productionTarget, 0);
  const totalProduction = skuRows.reduce((sum, row) => sum + row.realProduction, 0);

  const getPerformance = (target: number, actual: number) => {
    if (target <= 0) return 0;
    return (actual / target) * 100;
  };

  const getPerformanceClass = (perf: number) => {
    if (perf >= 90) return 'text-success bg-success/10';
    if (perf >= 75) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Products / SKUs
          </h3>
          {skuRows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {skuRows.length} product(s) • Target: {totalTarget.toLocaleString()} • Actual: {totalProduction.toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addSkuRow}
          className="btn-secondary text-sm"
        >
          <Plus size={16} />
          Add SKU
        </button>
      </div>

      {skuRows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded-lg">
          <Package size={24} className="mx-auto mb-2 opacity-50" />
          <p>No products added yet</p>
          <p className="text-xs mt-1">Click "Add SKU" to add products to this shift</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skuRows.map((row, index) => {
            const performance = getPerformance(row.productionTarget, row.realProduction);
            const hasSkuError = !row.sku.trim() && errors[`sku_${row.id}`];
            const hasTargetError = row.productionTarget <= 0 && errors[`target_${row.id}`];
            
            return (
              <div
                key={row.id}
                className="p-4 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Package size={14} className="text-primary" />
                    Product #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSkuRow(row.id)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    title="Remove this product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* SKU */}
                  <div className="md:col-span-1">
                    <label className="label text-xs">
                      SKU <span className="text-destructive">*</span>
                    </label>
                    {canReview ? (
                      <ProductSearch
                        value={row.sku}
                        onChange={(sku, product) => handleProductSelect(row.id, sku, product)}
                        placeholder="Search SKU..."
                      />
                    ) : (
                      <input
                        type="text"
                        value={row.sku}
                        onChange={e => updateSkuRow(row.id, 'sku', e.target.value)}
                        placeholder="SKU code"
                        className={`input-field text-sm ${hasSkuError ? 'border-destructive' : ''}`}
                        maxLength={50}
                      />
                    )}
                  </div>

                  {/* Product Name */}
                  <div className="md:col-span-1">
                    <label className="label text-xs">
                      Product Name
                      <span className="text-xs text-muted-foreground ml-1">(auto)</span>
                    </label>
                    <input
                      type="text"
                      value={row.product}
                      onChange={e => updateSkuRow(row.id, 'product', e.target.value)}
                      placeholder="Auto-filled"
                      className="input-field text-sm"
                      maxLength={100}
                    />
                  </div>

                  {/* Target */}
                  <div>
                    <label className="label text-xs">
                      Target <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      value={row.productionTarget || ''}
                      onChange={e => updateSkuRow(row.id, 'productionTarget', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                      className={`input-field text-sm ${hasTargetError ? 'border-destructive' : ''}`}
                    />
                  </div>

                  {/* Actual Production - Supervisor only */}
                  <div>
                    <label className="label text-xs">Actual</label>
                    <input
                      type="number"
                      value={row.realProduction || ''}
                      onChange={e => updateSkuRow(row.id, 'realProduction', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                      className="input-field text-sm"
                      disabled={!canReview}
                    />
                  </div>

                  {/* Performance */}
                  <div>
                    <label className="label text-xs">Performance</label>
                    <div className={`input-field text-sm font-semibold ${getPerformanceClass(performance)}`}>
                      {performance.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Warning for empty SKU */}
                {!row.sku.trim() && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle size={12} />
                    <span>SKU is required</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {skuRows.length > 1 && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Target:</span>
              <span className="ml-2 font-semibold">{totalTarget.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Actual:</span>
              <span className="ml-2 font-semibold">{totalProduction.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Overall:</span>
              <span className={`ml-2 font-semibold ${getPerformanceClass(getPerformance(totalTarget, totalProduction))}`}>
                {getPerformance(totalTarget, totalProduction).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
