import { ProductionSession, ShiftType } from '@/types/production';
import { DOWNTIME_CATEGORIES, DOWNTIME_REASONS_BY_CATEGORY } from '@/types/downtime';

interface PrintReportProps {
  sessions: ProductionSession[];
  date: string;
  shift: ShiftType;
  dateRange?: string;
}

export function PrintReport({ sessions, date, shift }: PrintReportProps) {
  const totalProduction = sessions.reduce((sum, s) => sum + s.totalProduction, 0);
  const totalPlanned = sessions.reduce((sum, s) => sum + s.plannedQuantity, 0);
  const totalDowntime = sessions.reduce((sum, s) => sum + s.totalDowntime, 0);
  const totalStaffPlanned = sessions.reduce((sum, s) => sum + s.staffPlanned, 0);
  const totalStaffActual = sessions.reduce((sum, s) => sum + s.staffActual, 0);

  // Group by leader
  const byLeader: Record<string, number> = {};
  sessions.forEach(s => { byLeader[s.lineLeader] = (byLeader[s.lineLeader] || 0) + s.totalProduction; });

  // All SKUs
  const bySku: Record<string, number> = {};
  sessions.forEach(s => { s.items.forEach(i => { if (i.sku) bySku[i.sku] = (bySku[i.sku] || 0) + i.quantityActual; }); });

  return (
    <div className="print-report p-8 bg-card text-foreground print:bg-white print:text-black">
      <style>{`@media print { .print-report { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-report table { page-break-inside: avoid; } .no-print { display: none !important; } }`}</style>
      <div className="border-b-2 border-foreground pb-4 mb-6 print:border-black">
        <h1 className="text-2xl font-bold">APPLIED NUTRITION - PRODUCTION REPORT</h1>
        <div className="flex gap-8 mt-2 text-sm">
          <span><strong>Date:</strong> {new Date(date).toLocaleDateString()}</span>
          <span><strong>Shift:</strong> {shift}</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Summary</h2>
        <table className="w-full text-sm"><tbody>
          <tr><td className="py-1"><strong>Total Production:</strong></td><td>{totalProduction.toLocaleString()} units</td><td><strong>Planned:</strong></td><td>{totalPlanned.toLocaleString()} units</td></tr>
          <tr><td className="py-1"><strong>Performance:</strong></td><td>{totalPlanned > 0 ? ((totalProduction / totalPlanned) * 100).toFixed(1) : 0}%</td><td><strong>Total Downtime:</strong></td><td>{totalDowntime} min</td></tr>
          <tr><td className="py-1"><strong>Staff Planned:</strong></td><td>{totalStaffPlanned}</td><td><strong>Staff Actual:</strong></td><td>{totalStaffActual}</td></tr>
        </tbody></table>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Production by Line</h2>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b"><th className="text-left py-2">Line</th><th className="text-left py-2">SKUs</th><th className="text-right py-2">Planned</th><th className="text-right py-2">Actual</th><th className="text-right py-2">Performance</th><th className="text-right py-2">Downtime</th></tr></thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className="border-b border-dashed">
                <td className="py-1">{s.productionLine}</td>
                <td className="py-1">{s.items.map(i => i.sku).join(', ')}</td>
                <td className="text-right py-1">{s.plannedQuantity.toLocaleString()}</td>
                <td className="text-right py-1">{s.totalProduction.toLocaleString()}</td>
                <td className="text-right py-1">{s.performance.toFixed(1)}%</td>
                <td className="text-right py-1">{s.totalDowntime} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Production by SKU</h2>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b"><th className="text-left py-2">SKU</th><th className="text-right py-2">Total Production</th></tr></thead>
          <tbody>{Object.entries(bySku).sort((a, b) => b[1] - a[1]).map(([sku, total]) => (
            <tr key={sku} className="border-b border-dashed"><td className="py-1">{sku}</td><td className="text-right py-1">{total.toLocaleString()}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div className="mt-8 pt-4 border-t text-xs text-center text-muted-foreground print:text-gray-500">Applied Nutrition Shift Report System - Confidential</div>
    </div>
  );
}
