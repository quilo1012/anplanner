import { ShiftReport, ShiftType } from '@/types/shift';
import { DOWNTIME_CATEGORIES } from '@/types/downtime';

interface PrintReportProps {
  shifts: ShiftReport[];
  date: string;
  shift: ShiftType;
}

export function PrintReport({ shifts, date, shift }: PrintReportProps) {
  const totalProduction = shifts.reduce((sum, s) => sum + s.realProduction, 0);
  const totalPlanned = shifts.reduce((sum, s) => sum + s.productionTarget, 0);
  const totalDowntime = shifts.reduce((sum, s) => sum + s.totalDowntime, 0);
  const totalStaffPlanned = shifts.reduce((sum, s) => sum + s.staffPlanned, 0);
  const totalStaffActual = shifts.reduce((sum, s) => sum + s.staffActual, 0);

  // Group by line
  const byLine: Record<string, ShiftReport[]> = {};
  shifts.forEach(s => {
    if (!byLine[s.productionLine]) byLine[s.productionLine] = [];
    byLine[s.productionLine].push(s);
  });

  // Group by leader
  const byLeader: Record<string, number> = {};
  shifts.forEach(s => {
    byLeader[s.lineLeader] = (byLeader[s.lineLeader] || 0) + s.realProduction;
  });

  // Group by SKU
  const bySku: Record<string, number> = {};
  shifts.forEach(s => {
    if (s.sku) {
      bySku[s.sku] = (bySku[s.sku] || 0) + s.realProduction;
    }
  });

  return (
    <div className="print-report p-8 bg-card text-foreground print:bg-white print:text-black">
      <style>{`
        @media print {
          .print-report { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .print-report table { page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-foreground pb-4 mb-6 print:border-black">
        <h1 className="text-2xl font-bold">APPLIED NUTRITION - SHIFT REPORT</h1>
        <div className="flex gap-8 mt-2 text-sm">
          <span><strong>Date:</strong> {new Date(date).toLocaleDateString()}</span>
          <span><strong>Shift:</strong> {shift}</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Summary</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1"><strong>Total Production:</strong></td>
              <td>{totalProduction.toLocaleString()} units</td>
              <td><strong>Planned:</strong></td>
              <td>{totalPlanned.toLocaleString()} units</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Performance:</strong></td>
              <td>{totalPlanned > 0 ? ((totalProduction / totalPlanned) * 100).toFixed(1) : 0}%</td>
              <td><strong>Total Downtime:</strong></td>
              <td>{totalDowntime} min</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Staff Planned:</strong></td>
              <td>{totalStaffPlanned}</td>
              <td><strong>Staff Actual:</strong></td>
              <td>{totalStaffActual}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Production by Line */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Production by Line</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Line</th>
              <th className="text-left py-2">SKU</th>
              <th className="text-right py-2">Planned</th>
              <th className="text-right py-2">Actual</th>
              <th className="text-right py-2">Performance</th>
              <th className="text-right py-2">Downtime</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byLine).map(([line, lineShifts]) => (
              lineShifts.map((s, idx) => (
                <tr key={s.id} className="border-b border-dashed">
                  <td className="py-1">{idx === 0 ? line : ''}</td>
                  <td className="py-1">{s.sku}</td>
                  <td className="text-right py-1">{s.productionTarget.toLocaleString()}</td>
                  <td className="text-right py-1">{s.realProduction.toLocaleString()}</td>
                  <td className="text-right py-1">{s.performance.toFixed(1)}%</td>
                  <td className="text-right py-1">{s.totalDowntime} min</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      {/* Production by SKU */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Production by SKU</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">SKU</th>
              <th className="text-right py-2">Total Production</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(bySku)
              .sort((a, b) => b[1] - a[1])
              .map(([sku, total]) => (
                <tr key={sku} className="border-b border-dashed">
                  <td className="py-1">{sku}</td>
                  <td className="text-right py-1">{total.toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Production by Leader */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Production by Leader</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Leader</th>
              <th className="text-right py-2">Total Production</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byLeader)
              .sort((a, b) => b[1] - a[1])
              .map(([leader, total]) => (
                <tr key={leader} className="border-b border-dashed">
                  <td className="py-1">{leader}</td>
                  <td className="text-right py-1">{total.toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Staffing */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 border-b pb-1">Staffing by Line</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Line</th>
              <th className="text-right py-2">Planned</th>
              <th className="text-right py-2">Actual</th>
              <th className="text-right py-2">Variance</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byLine).map(([line, lineShifts]) => {
              const planned = lineShifts.reduce((sum, s) => sum + s.staffPlanned, 0);
              const actual = lineShifts.reduce((sum, s) => sum + s.staffActual, 0);
              return (
                <tr key={line} className="border-b border-dashed">
                  <td className="py-1">{line}</td>
                  <td className="text-right py-1">{planned}</td>
                  <td className="text-right py-1">{actual}</td>
                  <td className="text-right py-1">{actual - planned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-xs text-center text-muted-foreground print:text-gray-500">
        Applied Nutrition Shift Report System - Confidential
      </div>
    </div>
  );
}
