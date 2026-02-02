import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { ProductSearch } from './ProductSearch';

interface SkuRowFormProps {
  skuRows: SkuRow[];
  onChange: (rows: SkuRow[]) => void;
  canReview?: boolean;
  errors?: Record<string, string>;
}

// Planner SKU Form - PLANNING ONLY (no production quantities)
// Behaves exactly like downtime entries: unlimited rows, + button, independent saves
export function SkuRowForm({ 
  skuRows, 
  onChange, 
  canReview = false,
  errors = {}
}: SkuRowFormProps) {
  const addSkuRow = () => {
    // Add new independent row - does NOT affect existing rows
    onChange([...skuRows, createEmptySkuRow()]);
  };

  const removeSkuRow = (id: string) => {
    // Remove only this specific row
    onChange(skuRows.filter(row => row.id !== id));
  };

  const updateSkuRow = (
    id: string, 
    field: keyof SkuRow, 
    value: string
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* SKU */}
                  <div>
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
                  <div>
                    <label className="label text-xs">
                      Product Name
                      <span className="text-xs text-muted-foreground ml-1">(auto-filled from SKU)</span>
                    </label>
                    <input
                      type="text"
                      value={row.product}
                      onChange={e => updateSkuRow(row.id, 'product', e.target.value)}
                      placeholder="Auto-filled from database"
                      className="input-field text-sm bg-muted"
                      maxLength={100}
                      readOnly
                    />
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
        <p className="font-medium text-foreground mb-1">Planning Mode</p>
        <p>Each SKU is saved as an independent record. You can add unlimited products per line and shift.</p>
      </div>
    </div>
  );
}