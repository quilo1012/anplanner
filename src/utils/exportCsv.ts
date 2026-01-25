import { ShiftReport } from '@/types/shift';

export function exportToCsv(data: ShiftReport[], filename: string) {
  const headers = [
    'Data',
    'Turno',
    'Linha',
    'Líder',
    'Produto',
    'SKU',
    'Meta',
    'Real',
    'Performance (%)',
    'Total Paradas (min)',
    'Observações'
  ];

  const rows = data.map(shift => [
    shift.date,
    shift.shift,
    shift.productionLine,
    shift.lineLeader,
    shift.product,
    shift.sku,
    shift.productionTarget.toString(),
    shift.realProduction.toString(),
    shift.performance.toFixed(1),
    shift.totalDowntime.toString(),
    `"${shift.observations.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}
