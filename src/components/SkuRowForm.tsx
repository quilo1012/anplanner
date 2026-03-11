import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertTriangle, Target, TrendingUp, Save, Clock, ClipboardPaste, Copy, FlaskConical, Hash } from 'lucide-react';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { ProductSearch } from './ProductSearch';
import { Checkbox } from './ui/checkbox';
import { batchLookupProducts } from '@/hooks/useProductSearch';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

/* ─── Memoized single-row component ─── */

interface SkuRowItemProps {
  row: SkuRow;
  index: number;
  canReview: boolean;
  showTarget: boolean;
  hasSkuError: boolean;
  hasDuplicateError: boolean;
  onUpdate: (id: string, field: keyof SkuRow, value: string | number) => void;
  onRemove: (id: string) => void;
  onProductSelect: (rowId: string, sku: string, product?: { sku: string; name: string; weightPerUnit?: number }) => void;
  onFoundStatusChange: (rowId: string, found: boolean) => void;
  onSaveToggle: (rowId: string, checked: boolean) => void;
}

const MemoizedSkuRow = React.memo(function SkuRowItem({
  row, index, canReview, showTarget, hasSkuError, hasDuplicateError,
  onUpdate, onRemove, onProductSelect, onFoundStatusChange, onSaveToggle,
}: SkuRowItemProps) {
  const performance = row.productionTarget > 0
    ? Math.round((row.realProduction / row.productionTarget) * 100)
    : 0;
  const performanceColor = performance >= 100 ? 'text-green-600' : performance >= 80 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-4 bg-card rounded-lg border border-border" data-row-id={row.id}>
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
          onClick={() => onRemove(row.id)}
          className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
          title="Remove this product"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* SKU and Product Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label text-xs">
            SKU <span className="text-destructive">*</span>
          </label>
          {canReview ? (
            <ProductSearch
              value={row.sku}
              onChange={(sku, product) => onProductSelect(row.id, sku, product)}
              onFoundStatusChange={(found) => onFoundStatusChange(row.id, found)}
              placeholder="Search SKU..."
            />
          ) : (
            <input
              type="text"
              value={row.sku}
              onChange={e => onUpdate(row.id, 'sku', e.target.value)}
              placeholder="SKU code"
              className={`input-field text-sm ${hasSkuError ? 'border-destructive' : ''}`}
              maxLength={50}
            />
          )}
        </div>

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
            onChange={e => onUpdate(row.id, 'product', e.target.value)}
            placeholder={row.isFoundInDb ? "Auto-filled from database" : "Enter product name"}
            className={`input-field text-sm ${row.isFoundInDb ? 'bg-muted' : ''}`}
            maxLength={100}
            readOnly={row.isFoundInDb}
          />
        </div>
      </div>

      {/* Batch Number and Blender Size Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="label text-xs flex items-center gap-1">
            <Hash size={12} className="text-primary" />
            Batch #
          </label>
          <input
            type="text"
            value={row.batchNumber}
            onChange={e => onUpdate(row.id, 'batchNumber', e.target.value)}
            placeholder="Batch number"
            className="input-field text-sm"
            maxLength={50}
          />
        </div>
        <div>
          <label className="label text-xs flex items-center gap-1">
            <FlaskConical size={12} className="text-primary" />
            Blender Size
          </label>
          <div className="relative">
            <input
              type="number"
              value={row.blenderSize || ''}
              onChange={e => onUpdate(row.id, 'blenderSize', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.01"
              className="input-field text-sm pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
          </div>
        </div>
        <div>
          <label className="label text-xs flex items-center gap-1">
            Weight/Unit
            {row.isFoundInDb && row.weightPerUnit > 0 && (
              <span className="text-xs text-muted-foreground ml-1">(auto-filled)</span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              value={row.weightPerUnit || ''}
              onChange={e => onUpdate(row.id, 'weightPerUnit', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.001"
              className={`input-field text-sm pr-8 ${row.isFoundInDb && row.weightPerUnit > 0 ? 'bg-muted' : ''}`}
              readOnly={row.isFoundInDb && row.weightPerUnit > 0}
              data-weight-input
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
          </div>
        </div>
      </div>

      {/* Blender estimate hint */}
      {row.blenderSize > 0 && row.weightPerUnit > 0 && (
        <div className="mb-3 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary font-medium flex items-center gap-1">
          <FlaskConical size={12} />
          → Estimated: {Math.floor(row.blenderSize / row.weightPerUnit).toLocaleString()} units
        </div>
      )}

      {/* Save to catalog checkbox */}
      {!row.isFoundInDb && row.sku.trim().length >= 2 && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-warning/10 border border-warning/30 rounded-md">
          <Checkbox
            id={`save-${row.id}`}
            checked={row.isNewProduct || false}
            onCheckedChange={(checked) => onSaveToggle(row.id, !!checked)}
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
      <div className={`grid grid-cols-1 ${showTarget ? 'md:grid-cols-2' : ''} gap-3 pt-3 border-t border-border`}>
        {showTarget && (
          <div>
            <label className="label text-xs flex items-center gap-1">
              <Target size={12} className="text-primary" />
              Production Target
            </label>
            <div className="relative">
              <input
                type="number"
                value={row.productionTarget || ''}
                onChange={e => onUpdate(row.id, 'productionTarget', parseInt(e.target.value) || 0)}
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
        )}

        <div>
          <label className="label text-xs flex items-center gap-1">
            <TrendingUp size={12} className="text-green-600" />
            Real Production
          </label>
          <div className="relative">
            <input
              type="number"
              value={row.realProduction || ''}
              onChange={e => onUpdate(row.id, 'realProduction', parseInt(e.target.value) || 0)}
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

      {/* Warning for duplicate SKU */}
      {hasDuplicateError && (
        <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
          <Copy size={12} />
          <span>Duplicate SKU — each SKU should appear only once per session</span>
        </div>
      )}
    </div>
  );
});

/* ─── Parent form ─── */

interface SkuRowFormProps {
  skuRows: SkuRow[];
  onChange: (rows: SkuRow[]) => void;
  canReview?: boolean;
  errors?: Record<string, string>;
  showTarget?: boolean;
  productionLine?: string;
}

export function SkuRowForm({
  skuRows,
  onChange,
  canReview = false,
  errors = {},
  showTarget = true,
  productionLine = '',
}: SkuRowFormProps) {
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Stable ref for skuRows so callbacks don't depend on the array
  const skuRowsRef = useRef(skuRows);
  skuRowsRef.current = skuRows;

  

  // Compute duplicate SKU set for visual warnings
  const duplicateSkus = useMemo(() => {
    const counts = new Map<string, number>();
    skuRows.forEach(row => {
      const key = row.sku.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [skuRows]);

  const addSkuRow = useCallback(() => {
    const newRow = createEmptySkuRow();
    onChange([...skuRowsRef.current, newRow]);
    // Auto-focus the new SKU input after render
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-sku-input]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement | null;
      if (lastInput) {
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastInput.focus();
      }
    }, 100);
  }, [onChange]);

  const handleRemove = useCallback((id: string) => {
    onChange(skuRowsRef.current.filter(row => row.id !== id));
  }, [onChange]);

  const handleUpdate = useCallback((
    id: string,
    field: keyof SkuRow,
    value: string | number
  ) => {
    onChange(
      skuRowsRef.current.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === 'product' && !row.isFoundInDb && String(value).trim().length > 0) {
            updated.isNewProduct = true;
          }
          // Auto-calculate production target when blenderSize or weightPerUnit changes
          if (field === 'blenderSize' || field === 'weightPerUnit') {
            const blender = field === 'blenderSize' ? Number(value) : row.blenderSize;
            const weight = field === 'weightPerUnit' ? Number(value) : row.weightPerUnit;
            if (blender > 0 && weight > 0) {
              updated.productionTarget = Math.floor(blender / weight);
            }
          }
          return updated;
        }
        return row;
      })
    );
  }, [onChange]);

  const handleProductSelect = useCallback(async (rowId: string, sku: string, product?: { sku: string; name: string; weightPerUnit?: number }) => {
    // Weight comes directly from ProductSearch — no extra DB query needed
    let weightPerUnit = product?.weightPerUnit || 0;

    // Try to fetch production target for this SKU + current line
    let targetData: { weight_per_unit: number; blender_capacity: number; expected_units_per_hour: number } | null = null;
    if (product && productionLine) {
      const { data } = await (supabase as any)
        .from('production_targets')
        .select('weight_per_unit, blender_capacity, expected_units_per_hour')
        .eq('product_code', product.sku)
        .eq('production_line', productionLine)
        .maybeSingle();
      targetData = data;
    }

    onChange(
      skuRowsRef.current.map(row => {
        if (row.id === rowId) {
          const w = targetData?.weight_per_unit || weightPerUnit;
          const b = targetData?.blender_capacity || 0;
          const updated = {
            ...row,
            sku,
            product: product?.name || row.product,
            isFoundInDb: !!product,
            isNewProduct: false,
            weightPerUnit: w,
            blenderSize: b || row.blenderSize,
          };
          // Auto-calculate if both values present
          if (updated.blenderSize > 0 && w > 0) {
            updated.productionTarget = Math.floor(updated.blenderSize / w);
          }
          return updated;
        }
        return row;
      })
    );

    // Auto-focus the blender size field for faster data entry
    if (product) {
      setTimeout(() => {
        const rowEl = document.querySelector(`[data-row-id="${rowId}"]`);
        if (rowEl) {
          const blenderInput = rowEl.querySelector('[data-blender-input]') as HTMLInputElement;
          blenderInput?.focus();
        }
      }, 100);
    }
  }, [onChange, productionLine]);

  const handleFoundStatusChange = useCallback((rowId: string, found: boolean) => {
    onChange(
      skuRowsRef.current.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            isFoundInDb: found,
            isNewProduct: !found && row.product.trim().length > 0 ? true : (found ? false : row.isNewProduct)
          };
        }
        return row;
      })
    );
  }, [onChange]);

  const handleSaveToggle = useCallback((rowId: string, checked: boolean) => {
    onChange(
      skuRowsRef.current.map(row =>
        row.id === rowId
          ? { ...row, isNewProduct: checked }
          : row
      )
    );
  }, [onChange]);

  const handleBatchPaste = useCallback(async () => {
    const skus = batchText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    const unique = [...new Set(skus)];
    if (unique.length === 0) return;

    const existingSkus = new Set(
      skuRowsRef.current.map(r => r.sku.trim().toLowerCase()).filter(Boolean)
    );

    const alreadyExist: string[] = [];
    const toAdd: string[] = [];
    unique.forEach(sku => {
      if (existingSkus.has(sku.trim().toLowerCase())) {
        alreadyExist.push(sku);
      } else {
        toAdd.push(sku);
      }
    });

    // Batch lookup from server
    const productMap = await batchLookupProducts(toAdd);

    let foundCount = 0;
    const newRows = toAdd.map(sku => {
      const product = productMap.get(sku.toLowerCase());
      if (product) foundCount++;
      return {
        ...createEmptySkuRow(),
        sku: product?.sku || sku,
        product: product?.name || '',
        isFoundInDb: !!product,
        isNewProduct: false,
      };
    });

    if (newRows.length > 0) {
      onChange([...skuRowsRef.current, ...newRows]);
    }
    setShowBatchPaste(false);
    setBatchText('');

    const parts: string[] = [];
    if (toAdd.length > 0) parts.push(`${toAdd.length} added (${foundCount} from catalog)`);
    if (alreadyExist.length > 0) parts.push(`${alreadyExist.length} skipped (already in list: ${alreadyExist.join(', ')})`);
    toast.success(parts.join(' • ') || 'No SKUs to add');
  }, [batchText, onChange]);

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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowBatchPaste(true)}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <ClipboardPaste size={16} />
            Paste SKUs
          </button>
          <button
            type="button"
            onClick={addSkuRow}
            className="btn-primary text-sm"
          >
            <Plus size={16} />
            Add SKU
          </button>
        </div>
      </div>

      {skuRows.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded-lg">
          <Package size={24} className="mx-auto mb-2 opacity-50" />
          <p>No products planned yet</p>
          <p className="text-xs mt-1">Click "Add SKU" to plan products for this shift</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skuRows.map((row, index) => (
            <MemoizedSkuRow
              key={row.id}
              row={row}
              index={index}
              canReview={canReview}
              showTarget={showTarget}
              hasSkuError={!row.sku.trim() && !!errors[`sku_${row.id}`]}
              hasDuplicateError={duplicateSkus.has(row.sku.trim().toLowerCase())}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onProductSelect={handleProductSelect}
              onFoundStatusChange={handleFoundStatusChange}
              onSaveToggle={handleSaveToggle}
            />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Production Tracking</p>
        <p>Enter the target quantity and actual production for each SKU. Performance is calculated automatically.</p>
      </div>

      {/* Batch Paste Dialog */}
      <Dialog open={showBatchPaste} onOpenChange={setShowBatchPaste}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste size={18} className="text-primary" />
              Paste Multiple SKUs
            </DialogTitle>
            <DialogDescription>
              Enter SKU codes separated by commas, semicolons, or one per line. Products found in the catalog will be auto-filled.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            placeholder={"SKU001\nSKU002\nSKU003\n\nor: SKU001, SKU002, SKU003"}
            rows={6}
          />
          <DialogFooter>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => { setShowBatchPaste(false); setBatchText(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={handleBatchPaste}
              disabled={!batchText.trim()}
            >
              <Plus size={16} />
              Add SKUs
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
