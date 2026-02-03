import { Plus, Trash2, Package, AlertTriangle, Target, TrendingUp, Save, Clock } from 'lucide-react';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { ProductSearch } from './ProductSearch';
import { Checkbox } from './ui/checkbox';

interface SkuRowFormProps {
  skuRows: SkuRow[];
  onChange: (rows: SkuRow[]) => void;
  canReview?: boolean;
  errors?: Record<string, string>;
}

// Planner SKU Form - Now captures Target and Real Production per SKU
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

  const handleFoundStatusChange = (rowId: string, found: boolean) => {
    onChange(
      skuRows.map(row => 
        row.id === rowId 
          ? { ...row, isFoundInDb: found, isNewProduct: !found ? row.isNewProduct : false } 
          : row
      )
    );
  };

  const handleSaveToDbToggle = (rowId: string, checked: boolean) => {
    onChange(
      skuRows.map(row => 
        row.id === rowId 
          ? { ...row, isNewProduct: checked } 
          : row
      )
    );
  };

  // Calculate performance for display
  const calculatePerformance = (target: number, real: number): number => {
    if (target <= 0) return 0;
    return Math.round((real / target) * 100);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Products / SKUs
          </h3>
          <p className="text-sm text-muted-foreground">
            {skuRows.length} product(s) planned • Add unlimited SKUs per line
          </p>
        </div>
        <button
          type="button"
          onClick={addSkuRow}
          className="btn-primary text-sm"
        >
          <Plus size={16} />
          Add SKU
        </button>
      </div>

      {skuRows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded-lg">
          <Package size={24} className="mx-auto mb-2 opacity-50" />
          <p>No products planned yet</p>
          <p className="text-xs mt-1">Click "Add SKU" to plan products for this shift</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skuRows.map((row, index) => {
            const hasSkuError = !row.sku.trim() && errors[`sku_${row.id}`];
            const performance = calculatePerformance(row.productionTarget, row.realProduction);
            const performanceColor = performance >= 100 ? 'text-green-600' : performance >= 80 ? 'text-yellow-600' : 'text-red-600';
            
            return (
              <div
                key={row.id}
                className="p-4 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Package size={14} className="text-primary" />
                    Product #{index + 1}
                    {row.productionTarget > 0 && (
                      <span className={`text-xs font-bold ${performanceColor}`}>
                        ({performance}%)
                      </span>
                    )}
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

                {/* SKU and Product Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {/* SKU */}
                  <div>
                    <label className="label text-xs">
                      SKU <span className="text-destructive">*</span>
                    </label>
                    {canReview ? (
                      <ProductSearch
                        value={row.sku}
                        onChange={(sku, product) => handleProductSelect(row.id, sku, product)}
                        onFoundStatusChange={(found) => handleFoundStatusChange(row.id, found)}
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

                  {/* Product Name - Editable when SKU not found in DB */}
                  <div>
                    <label className="label text-xs">
                      Product Name
                      {row.isFoundInDb ? (
                        <span className="text-xs text-muted-foreground ml-1">(auto-filled)</span>
                      ) : row.sku.trim().length >= 2 ? (
                        <span className="text-xs text-warning ml-1">(manual entry)</span>
                      ) : (
                        <span className="text-xs text-muted-foreground ml-1">(auto-filled from SKU)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={row.product}
                      onChange={e => updateSkuRow(row.id, 'product', e.target.value)}
                      placeholder={row.isFoundInDb ? "Auto-filled from database" : "Enter product name"}
                      className={`input-field text-sm ${row.isFoundInDb ? 'bg-muted' : ''}`}
                      maxLength={100}
                      readOnly={row.isFoundInDb}
                    />
                  </div>
                </div>

                {/* Save to catalog checkbox - Only show when SKU not found and has value */}
                {!row.isFoundInDb && row.sku.trim().length >= 2 && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-warning/10 border border-warning/30 rounded-md">
                    <Checkbox
                      id={`save-${row.id}`}
                      checked={row.isNewProduct || false}
                      onCheckedChange={(checked) => handleSaveToDbToggle(row.id, !!checked)}
                    />
                    <label 
                      htmlFor={`save-${row.id}`} 
                      className="text-sm text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <Save size={12} className="text-primary" />
                      Save to product catalog
                    </label>
                  </div>
                )}

                {/* Target and Real Production Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
                  {/* Target */}
                  <div>
                    <label className="label text-xs flex items-center gap-1">
                      <Target size={12} className="text-primary" />
                      Production Target
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={row.productionTarget || ''}
                        onChange={e => updateSkuRow(row.id, 'productionTarget', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="input-field text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        units
                      </span>
                    </div>
                    {row.productionTarget > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {(row.productionTarget / 570).toFixed(2)} units/min
                      </div>
                    )}
                  </div>

                  {/* Real Production */}
                  <div>
                    <label className="label text-xs flex items-center gap-1">
                      <TrendingUp size={12} className="text-green-600" />
                      Real Production
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={row.realProduction || ''}
                        onChange={e => updateSkuRow(row.id, 'realProduction', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="input-field text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        units
                      </span>
                    </div>
                    {row.realProduction > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {(row.realProduction / 570).toFixed(2)} units/min
                      </div>
                    )}
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

      {/* Info banner */}
      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Production Tracking</p>
        <p>Enter the target quantity and actual production for each SKU. Performance is calculated automatically.</p>
      </div>
    </div>
  );
}
