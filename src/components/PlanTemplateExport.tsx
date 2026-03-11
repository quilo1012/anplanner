import ExcelJS from 'exceljs';
import { Download } from 'lucide-react';

const TEMPLATE_COLUMNS = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Assembly Number', key: 'assembly_number', width: 18 },
  { header: 'Work Centre', key: 'work_centre', width: 16 },
  { header: 'Product Code', key: 'product_code', width: 18 },
  { header: 'Weight (in Kg)', key: 'weight_kg', width: 16 },
  { header: 'QTY', key: 'qty', width: 10 },
  { header: 'Start Time', key: 'start_time', width: 14 },
  { header: 'Finish Time', key: 'finish_time', width: 14 },
  { header: 'Shift', key: 'shift', width: 10 },
  { header: 'Workers in the Line', key: 'workers_in_line', width: 20 },
  { header: 'Support Workers', key: 'support_workers', width: 18 },
  { header: 'Comments', key: 'comments', width: 30 },
  { header: 'PCL list', key: 'pcl_list', width: 20 },
];

export function PlanTemplateExport() {
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Production Plan');

    sheet.columns = TEMPLATE_COLUMNS;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // Add Shift dropdown validation for column I (index 9)
    for (let row = 2; row <= 200; row++) {
      sheet.getCell(`I${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"DAY,NIGHT"'],
      };
      // Date format hint
      sheet.getCell(`A${row}`).numFmt = 'yyyy-mm-dd';
      // Time format hints
      sheet.getCell(`G${row}`).numFmt = 'hh:mm';
      sheet.getCell(`H${row}`).numFmt = 'hh:mm';
    }

    // Add example row
    sheet.addRow({
      date: new Date().toISOString().split('T')[0],
      assembly_number: 'ASM-001',
      work_centre: 'WC-A',
      product_code: 'PROD-001',
      weight_kg: 0.5,
      qty: 1000,
      start_time: '06:00',
      finish_time: '14:00',
      shift: 'DAY',
      workers_in_line: 8,
      support_workers: 2,
      comments: '',
      pcl_list: '',
    });
    const exampleRow = sheet.getRow(2);
    exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-plan-template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={handleExport} className="btn-secondary">
      <Download size={18} />
      <span className="hidden sm:inline">Export Template</span>
    </button>
  );
}
