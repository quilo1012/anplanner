import { ProductionSession, ShiftType } from '@/types/production';
import { DOWNTIME_CATEGORIES } from '@/types/downtime';
import { formatDuration } from '@/utils/formatDuration';
import { naturalLineSort } from '@/utils/naturalLineSort';
import appliedLogo from '@/assets/applied-logo-mono.jpg';

interface PrintReportProps {
  sessions: ProductionSession[];
  date: string;
  shift: ShiftType;
  dateRange?: string;
}

export function PrintReport({ sessions, date, shift }: PrintReportProps) {
  const sorted = [...sessions].sort((a, b) => naturalLineSort(a.productionLine, b.productionLine));
  const totalProduction = sorted.reduce((sum, s) => sum + s.totalProduction, 0);
  const totalPlanned = sorted.reduce((sum, s) => sum + s.plannedQuantity, 0);
  const totalDowntime = sorted.reduce((sum, s) => sum + s.totalDowntime, 0);
  const totalStaffPlanned = sorted.reduce((sum, s) => sum + s.staffPlanned, 0);
  const totalStaffActual = sorted.reduce((sum, s) => sum + s.staffActual, 0);
  const overallPerformance = totalPlanned > 0 ? ((totalProduction / totalPlanned) * 100).toFixed(1) : '0';

  // All SKUs
  const bySku: Record<string, number> = {};
  sorted.forEach(s => { s.items.forEach(i => { if (i.sku) bySku[i.sku] = (bySku[i.sku] || 0) + i.quantityActual; }); });

  // Downtime summary by category
  const dtByCategory: Record<string, number> = {};
  sorted.forEach(s => {
    if (s.structuredDowntimes) {
      s.structuredDowntimes.forEach(dt => {
        dtByCategory[dt.category] = (dtByCategory[dt.category] || 0) + dt.duration;
      });
    }
  });

  const getCategoryLabel = (val: string) => DOWNTIME_CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="print-report p-8 bg-card text-foreground print:bg-white print:text-black">
      <style>{`@media print { .print-report { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-report table { page-break-inside: avoid; } .no-print { display: none !important; } }`}</style>
      
      {/* Header */}
      <div className="border-b-2 border-foreground pb-4 mb-6 print:border-black flex items-center gap-4">
        <img src={appliedLogo} alt="Applied Nutrition" className="h-16 w-auto print:h-16" />
        <div>
          <h1 className="text-2xl font-bold">PRODUCTION REPORT</h1>
          <div className="flex gap-8 mt-2 text-sm">
            <span><strong>Date:</strong> {new Date(date).toLocaleDateString()}</span>
            <span><strong>Shift:</strong> {shift}</span>
            <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Summary</h2>
        <table className="w-full text-sm"><tbody>
          <tr><td className="py-1"><strong>Total Production:</strong></td><td>{totalProduction.toLocaleString()} units</td><td><strong>Planned:</strong></td><td>{totalPlanned.toLocaleString()} units</td></tr>
          <tr className="print:bg-gray-50"><td className="py-1"><strong>Performance:</strong></td><td>{overallPerformance}%</td><td><strong>Total Downtime:</strong></td><td>{formatDuration(totalDowntime)}</td></tr>
          <tr><td className="py-1"><strong>Staff Planned:</strong></td><td>{totalStaffPlanned}</td><td><strong>Staff Actual:</strong></td><td>{totalStaffActual}</td></tr>
        </tbody></table>
      </div>

      {/* Production by Line */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Production by Line</h2>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2">
            <th className="text-left py-2">Line</th>
            <th className="text-left py-2">Leader</th>
            <th className="text-left py-2">SKUs</th>
            <th className="text-right py-2">Planned</th>
            <th className="text-right py-2">Actual</th>
            <th className="text-right py-2">Perf.</th>
            <th className="text-right py-2">Downtime</th>
            <th className="text-center py-2">Staff</th>
          </tr></thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} className={i % 2 === 1 ? 'print:bg-gray-50' : ''}>
                <td className="py-1.5 font-medium">{s.productionLine}</td>
                <td className="py-1.5">{s.lineLeader}</td>
                <td className="py-1.5">{s.items.map(i => i.sku).join(', ')}</td>
                <td className="text-right py-1.5">{s.plannedQuantity.toLocaleString()}</td>
                <td className="text-right py-1.5">{s.totalProduction.toLocaleString()}</td>
                <td className="text-right py-1.5">{s.performance.toFixed(1)}%</td>
                <td className="text-right py-1.5">{formatDuration(s.totalDowntime)}</td>
                <td className="text-center py-1.5">{s.staffActual}/{s.staffPlanned}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold">
              <td className="py-1.5" colSpan={3}>TOTALS</td>
              <td className="text-right py-1.5">{totalPlanned.toLocaleString()}</td>
              <td className="text-right py-1.5">{totalProduction.toLocaleString()}</td>
              <td className="text-right py-1.5">{overallPerformance}%</td>
              <td className="text-right py-1.5">{formatDuration(totalDowntime)}</td>
              <td className="text-center py-1.5">{totalStaffActual}/{totalStaffPlanned}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Production Items Detail */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Production Items Detail</h2>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2">
            <th className="text-left py-2">Line</th>
            <th className="text-left py-2">SKU</th>
            <th className="text-left py-2">Product</th>
            <th className="text-right py-2">Target</th>
            <th className="text-right py-2">Actual</th>
            <th className="text-right py-2">Perf.</th>
          </tr></thead>
          <tbody>
            {sorted.flatMap((s) =>
              s.items.map((item, j) => (
                <tr key={`${s.id}-${item.id}`} className={j % 2 === 1 ? 'print:bg-gray-50' : ''}>
                  <td className="py-1 font-medium">{s.productionLine}</td>
                  <td className="py-1 font-mono">{item.sku}</td>
                  <td className="py-1">{item.productName}</td>
                  <td className="text-right py-1">{item.quantityTarget.toLocaleString()}</td>
                  <td className="text-right py-1">{item.quantityActual.toLocaleString()}</td>
                  <td className="text-right py-1">{item.quantityTarget > 0 ? `${((item.quantityActual / item.quantityTarget) * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Downtime Detail */}
      {sorted.some(s => s.structuredDowntimes && s.structuredDowntimes.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Downtime Detail</h2>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2">
              <th className="text-left py-2">Line</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Reason</th>
              <th className="text-right py-2">Duration</th>
              <th className="text-left py-2">Comment</th>
            </tr></thead>
            <tbody>
              {sorted.flatMap((s) =>
                (s.structuredDowntimes || []).map((dt, j) => (
                  <tr key={`${s.id}-${dt.id}`} className={j % 2 === 1 ? 'print:bg-gray-50' : ''}>
                    <td className="py-1 font-medium">{s.productionLine}</td>
                    <td className="py-1">{getCategoryLabel(dt.category)}</td>
                    <td className="py-1">{dt.reason}</td>
                    <td className="text-right py-1">{formatDuration(dt.duration)}</td>
                    <td className="py-1 text-xs italic">{dt.comment || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Downtime Summary by Category */}
      {Object.keys(dtByCategory).length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Downtime Summary</h2>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2"><th className="text-left py-2">Category</th><th className="text-right py-2">Total Duration</th></tr></thead>
            <tbody>{Object.entries(dtByCategory).sort((a, b) => b[1] - a[1]).map(([cat, dur], i) => (
              <tr key={cat} className={i % 2 === 1 ? 'print:bg-gray-50' : ''}><td className="py-1.5">{getCategoryLabel(cat)}</td><td className="text-right py-1.5">{formatDuration(dur)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Production by SKU */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b-2 pb-1">Production by SKU</h2>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b-2"><th className="text-left py-2">SKU</th><th className="text-right py-2">Total Production</th></tr></thead>
          <tbody>{Object.entries(bySku).sort((a, b) => b[1] - a[1]).map(([sku, total], i) => (
            <tr key={sku} className={i % 2 === 1 ? 'print:bg-gray-50' : ''}><td className="py-1.5">{sku}</td><td className="text-right py-1.5">{total.toLocaleString()}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div className="mt-8 pt-4 border-t text-xs text-center text-muted-foreground print:text-gray-500">Applied Nutrition Shift Report System — Confidential</div>
    </div>
  );
}
