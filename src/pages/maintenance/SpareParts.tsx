import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useSpareParts } from '@/hooks/useSpareParts';
import { Loader2, Package, AlertTriangle } from 'lucide-react';

export function SpareParts() {
  const { parts, isLoading, error, lowStockCount } = useSpareParts();
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const filteredParts = useMemo(
    () => showLowStockOnly ? parts.filter(p => p.quantity <= p.min_stock) : parts,
    [parts, showLowStockOnly]
  );

  return (
    <>
      <Header
        title="Spare Parts"
        subtitle="Maintenance stock inventory"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {lowStockCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} />
            {lowStockCount} part{lowStockCount !== 1 ? 's' : ''} at or below minimum stock
          </div>
        )}

        <div className="card p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLowStockOnly} onChange={(e) => setShowLowStockOnly(e.target.checked)} />
              Low stock only
            </label>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading spare parts...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">{error}</div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No spare parts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Part</th>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Line</th>
                    <th className="py-2 pr-3 text-right">Quantity</th>
                    <th className="py-2 pr-3 text-right">Min Stock</th>
                    <th className="py-2 pr-3 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredParts.map(p => {
                    const isLow = p.quantity <= p.min_stock;
                    return (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="py-2 pr-3 font-medium text-foreground flex items-center gap-2">
                          <Package size={14} className="text-muted-foreground" /> {p.name}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{p.code}</td>
                        <td className="py-2 pr-3 capitalize">{p.category}</td>
                        <td className="py-2 pr-3">{p.line || '—'}</td>
                        <td className={`py-2 pr-3 text-right font-medium ${isLow ? 'text-destructive' : 'text-foreground'}`}>{p.quantity}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{p.min_stock}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">£{p.price.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SpareParts;
