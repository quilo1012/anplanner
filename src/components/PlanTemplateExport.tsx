import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';

const TEMPLATE_COLUMNS = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Assembly Number', key: 'assembly_number', width: 18 },
  { header: 'Work Centre', key: 'work_centre', width: 16 },
  { header: 'Product Code', key: 'product_code', width: 18 },
  { header: 'Product Description', key: 'product_description', width: 36 },
  { header: 'Weight (in Kg)', key: 'weight_kg', width: 16 },
  { header: 'QTY', key: 'qty', width: 10 },
  { header: 'Start Time', key: 'start_time', width: 14 },
  { header: 'Finish Time', key: 'finish_time', width: 14 },
  { header: 'Shift', key: 'shift', width: 10 },
  { header: 'Target (units/min)', key: 'target_upm', width: 18 },
];

const EXAMPLE_ROWS = [
  {
    date: '3/9/2026',
    assembly_number: '',
    work_centre: 'Tablet',
    product_code: 'SOLCOLLAGEN',
    product_description: 'SOLUTIONS COLLAGEN 60 CAPSULES',
    weight_kg: 0,
    qty: 2782,
    start_time: '6:15 AM',
    finish_time: '12:45 PM',
    shift: 'DAY',
  },
  {
    date: '3/9/2026',
    assembly_number: '',
    work_centre: 'Tablet',
    product_code: 'COLCOCO',
    product_description: 'COLLAGEN + COCONUT 180 CAPS',
    weight_kg: 0,
    qty: 2498,
    start_time: '12:45 PM',
    finish_time: '5:00 PM',
    shift: 'DAY',
  },
  {
    date: '3/9/2026',
    assembly_number: '',
    work_centre: 'Line 1',
    product_code: 'ABEENG',
    product_description: 'A.B.E 375G ENERGY',
    weight_kg: 0.375,
    qty: 785,
    start_time: '6:15 AM',
    finish_time: '7:45 AM',
    shift: 'DAY',
  },
];

export function PlanTemplateExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Production Plan');

      sheet.columns = TEMPLATE_COLUMNS;

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 24;

      for (let row = 2; row <= 200; row++) {
        sheet.getCell(`J${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"DAY,NIGHT"'],
        };
      }

      EXAMPLE_ROWS.forEach((data) => {
        const row = sheet.addRow(data);
        row.font = { italic: true, color: { argb: 'FF9CA3AF' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer as ArrayBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'production-plan-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Template exported successfully');
    } catch (err) {
      console.error('Export template failed:', err);
      toast.error('Failed to export template');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleExport} disabled={isExporting} className="gap-2">
      {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      {isExporting ? 'Exporting...' : 'Export Template'}
    </Button>
  );
}
