import { ProductionSession } from '@/types/production';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function exportSessionsToCsv(sessions: ProductionSession[], filename: string): void {
  const headers = [
    'Date', 'Shift', 'Production Line', 'Line Leader',
    'SKU', 'Product', 'SKU Target', 'SKU Actual',
    'Line Target', 'Line Actual', 'Performance (%)',
    'Total Downtime (min)', 'Comments',
  ];

  const rows: string[][] = [];
  sessions.forEach(session => {
    if (session.items.length === 0) {
      rows.push([
        session.date, session.shift, session.productionLine, session.lineLeader,
        '', '', '0', '0',
        session.plannedQuantity.toString(), session.totalProduction.toString(),
        session.performance.toFixed(1), session.totalDowntime.toString(),
        session.comments || '',
      ]);
    } else {
      session.items.forEach((item, idx) => {
        rows.push([
          idx === 0 ? session.date : '', idx === 0 ? session.shift : '',
          idx === 0 ? session.productionLine : '', idx === 0 ? session.lineLeader : '',
          item.sku, item.productName,
          item.quantityTarget.toString(), item.quantityActual.toString(),
          idx === 0 ? session.plannedQuantity.toString() : '',
          idx === 0 ? session.totalProduction.toString() : '',
          idx === 0 ? session.performance.toFixed(1) : '',
          idx === 0 ? session.totalDowntime.toString() : '',
          idx === 0 ? (session.comments || '') : '',
        ]);
      });
    }
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Keep old export for backward compat
export function exportToCsv(shifts: Parameters<typeof exportSessionsToCsv>[0], filename: string): void {
  exportSessionsToCsv(shifts, filename);
}
