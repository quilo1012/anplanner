import { ProductionSession, ShiftType } from '@/types/production';
import { naturalLineSort } from './naturalLineSort';
import { formatDuration } from './formatDuration';

const LOGO_URL = '/lovable-uploads/64131b92-9113-4e13-88d8-667e720cb54f.png';

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportHistoryPdf(
  sessions: ProductionSession[],
  opts: { fromDate?: string; shift?: ShiftType | '' } = {}
): Promise<void> {
  if (sessions.length === 0) throw new Error('No sessions to export');

  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableMod as { default: unknown }).default as (
    doc: unknown,
    opts: Record<string, unknown>
  ) => void;

  const sorted = [...sessions].sort((a, b) => naturalLineSort(a.productionLine, b.productionLine));
  const totalProduction = sorted.reduce((s, x) => s + x.totalProduction, 0);
  const totalPlanned = sorted.reduce((s, x) => s + x.plannedQuantity, 0);
  const totalDowntime = sorted.reduce((s, x) => s + x.totalDowntime, 0);
  const totalStaffPlanned = sorted.reduce((s, x) => s + x.staffPlanned, 0);
  const totalStaffActual = sorted.reduce((s, x) => s + x.staffActual, 0);
  const overallPerf = totalPlanned > 0 ? ((totalProduction / totalPlanned) * 100).toFixed(1) : '0';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const reportDate = opts.fromDate || new Date().toISOString().split('T')[0];
  const shiftLabel = opts.shift || 'ALL';

  // Header
  const logo = await loadLogoDataUrl();
  let headerY = 30;
  if (logo) {
    try { doc.addImage(logo, 'PNG', 40, 20, 60, 40); } catch { /* ignore */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRODUCTION REPORT', 110, headerY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Date: ${new Date(reportDate).toLocaleDateString()}   |   Shift: ${shiftLabel}   |   Generated: ${new Date().toLocaleString()}`,
    110,
    headerY + 22
  );
  doc.setDrawColor(50);
  doc.setLineWidth(1);
  doc.line(40, 70, pageWidth - 40, 70);
  doc.setTextColor(0);

  let cursorY = 90;

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', 40, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    body: [
      ['Total Production:', `${totalProduction.toLocaleString()} units`, 'Planned:', `${totalPlanned.toLocaleString()} units`],
      ['Performance:', `${overallPerf}%`, 'Total Downtime:', formatDuration(totalDowntime)],
      ['Staff Planned:', String(totalStaffPlanned), 'Staff Actual:', String(totalStaffActual)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110 },
      2: { fontStyle: 'bold', cellWidth: 110 },
    },
    margin: { left: 40, right: 40 },
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Production by Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Production by Line', 40, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    head: [['Line', 'Leader', 'SKUs', 'Planned', 'Actual', 'Perf.', 'Downtime', 'Staff']],
    body: sorted.map(s => [
      s.productionLine,
      s.lineLeader,
      s.items.map(i => i.sku).join(', '),
      s.plannedQuantity.toLocaleString(),
      s.totalProduction.toLocaleString(),
      `${s.performance.toFixed(1)}%`,
      formatDuration(s.totalDowntime),
      `${s.staffActual}/${s.staffPlanned}`,
    ]),
    foot: [[
      'TOTALS', '', '',
      totalPlanned.toLocaleString(),
      totalProduction.toLocaleString(),
      `${overallPerf}%`,
      formatDuration(totalDowntime),
      `${totalStaffActual}/${totalStaffPlanned}`,
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'right' }, 7: { halign: 'center' },
    },
    margin: { left: 40, right: 40 },
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Production Items Detail
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Production Items Detail', 40, cursorY);
  cursorY += 6;
  const itemRows = sorted.flatMap(s => s.items.map(it => [
    s.productionLine,
    it.sku,
    it.productName,
    it.quantityTarget.toLocaleString(),
    it.quantityActual.toLocaleString(),
    it.quantityTarget > 0 ? `${((it.quantityActual / it.quantityTarget) * 100).toFixed(1)}%` : '-',
  ]));
  autoTable(doc, {
    startY: cursorY,
    head: [['Line', 'SKU', 'Product', 'Target', 'Actual', 'Perf.']],
    body: itemRows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Downtime Detail (if any)
  const dtRows = sorted.flatMap(s => (s.structuredDowntimes || []).map(dt => [
    s.productionLine,
    dt.category,
    dt.reason,
    formatDuration(dt.duration),
    dt.comment || '-',
  ]));
  if (dtRows.length > 0) {
    if (cursorY > pageHeight - 100) { doc.addPage(); cursorY = 40; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Downtime Detail', 40, cursorY);
    cursorY += 6;
    autoTable(doc, {
      startY: cursorY,
      head: [['Line', 'Category', 'Reason', 'Duration', 'Comment']],
      body: dtRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Applied Nutrition Shift Report System — Confidential   |   Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
  }

  const filename = `production-report-${reportDate}.pdf`;
  doc.save(filename);
}
