import { ShiftReport, DOWNTIME_REASON_LABELS } from '@/types/shift';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function exportToCsv(shifts: ShiftReport[], filename: string): void {
  const headers = [
    'Date',
    'Shift',
    'Production Line',
    'Line Leader',
    'Product',
    'SKU',
    'Target',
    'Actual',
    'Performance (%)',
    'Total Downtime (min)',
    'Downtime Details',
    'Notes',
  ];

  const rows = shifts.map(shift => {
    const downtimeDetails = shift.downtimes
      .map(d => `${DOWNTIME_REASON_LABELS[d.reason]}: ${d.duration}min${d.notes ? ` (${d.notes})` : ''}`)
      .join('; ');

    return [
      shift.date,
      shift.shift,
      shift.productionLine,
      shift.lineLeader,
      shift.product || '',
      shift.sku || '',
      shift.productionTarget.toString(),
      shift.realProduction.toString(),
      shift.performance.toFixed(1),
      shift.totalDowntime.toString(),
      downtimeDetails,
      shift.observations || '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
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
