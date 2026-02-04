import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, X, Check, AlertTriangle } from 'lucide-react';
import { ShiftFormData, ShiftType } from '@/types/shift';

interface ParsedEntry {
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  product: string;
  sku: string;
  productionTarget: number;
  isValid: boolean;
  errors: string[];
}

interface ExcelUploadProps {
  onImport: (entries: ShiftFormData[]) => void;
  onClose: () => void;
}

export function ExcelUpload({ onImport, onClose }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Convert Excel serial date to YYYY-MM-DD
  const excelDateToString = (serial: number): string => {
    // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    // So we need to subtract 1 for dates after Feb 28, 1900
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split('T')[0];
  };

  const parseDate = (value: unknown): string | null => {
    if (!value) return null;
    
    // If it's already a string in YYYY-MM-DD format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // If it's a number (Excel date serial)
    if (typeof value === 'number') {
      try {
        return excelDateToString(value);
      } catch {
        return null;
      }
    }
    
    // If it's a Date object (ExcelJS returns Date for date cells)
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // Try parsing as date string
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  const parseShift = (value: unknown): ShiftType | null => {
    if (!value) return null;
    const normalized = String(value).toUpperCase().trim();
    // Primary DAY/NIGHT mapping
    if (normalized === 'DAY' || normalized === 'D') return 'DAY';
    if (normalized === 'NIGHT' || normalized === 'N') return 'NIGHT';
    // Legacy A/B/C mapping
    if (normalized === 'A' || normalized === 'B') return 'DAY';
    if (normalized === 'C') return 'NIGHT';
    return null;
  };

  // Safely get cell value from ExcelJS cell
  const getCellValue = (cell: ExcelJS.Cell | undefined): unknown => {
    if (!cell) return undefined;
    const value = cell.value;
    
    // Handle rich text
    if (value && typeof value === 'object' && 'richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText
        .map((rt) => rt.text)
        .join('');
    }
    
    // Handle formula results
    if (value && typeof value === 'object' && 'result' in value) {
      return (value as ExcelJS.CellFormulaValue).result;
    }
    
    // Handle hyperlinks
    if (value && typeof value === 'object' && 'text' in value) {
      return (value as ExcelJS.CellHyperlinkValue).text;
    }
    
    return value;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setError(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setError('No worksheet found in the Excel file');
        setIsLoading(false);
        return;
      }

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers: Record<string, number> = {};
      headerRow.eachCell((cell, colNumber) => {
        const value = getCellValue(cell);
        if (value) {
          headers[String(value).trim()] = colNumber;
        }
      });

      // Check for required columns
      const requiredColumns = ['Date', 'Shift', 'Production Line', 'Product Name', 'Planned Quantity'];
      const missingColumns = requiredColumns.filter(col => !headers[col]);
      if (missingColumns.length > 0) {
        setError(`Missing required columns: ${missingColumns.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const parsed: ParsedEntry[] = [];
      
      // Process data rows (starting from row 2)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const errors: string[] = [];
        
        const dateValue = getCellValue(row.getCell(headers['Date']));
        const date = parseDate(dateValue);
        if (!date) errors.push('Invalid or missing Date');
        
        const shiftValue = getCellValue(row.getCell(headers['Shift']));
        const shift = parseShift(shiftValue);
        if (!shift) errors.push('Invalid Shift (use DAY/NIGHT)');
        
        const productionLineValue = getCellValue(row.getCell(headers['Production Line']));
        const productionLine = productionLineValue?.toString().trim();
        if (!productionLine) errors.push('Missing Production Line');
        
        const productValue = getCellValue(row.getCell(headers['Product Name']));
        const product = productValue?.toString().trim();
        if (!product) errors.push('Missing Product Name');
        
        const targetValue = getCellValue(row.getCell(headers['Planned Quantity']));
        const target = Number(targetValue);
        if (isNaN(target) || target <= 0) errors.push('Invalid Planned Quantity');

        const leaderValue = headers['Line Leader'] 
          ? getCellValue(row.getCell(headers['Line Leader']))
          : undefined;
        const lineLeader = leaderValue?.toString().trim() || 'TBD';

        const skuValue = headers['SKU'] 
          ? getCellValue(row.getCell(headers['SKU']))
          : undefined;
        const sku = skuValue?.toString().trim() || '';

        parsed.push({
          date: date || '',
          shift: shift || 'DAY',
          productionLine: productionLine || '',
          lineLeader,
          product: product || '',
          sku,
          productionTarget: target > 0 ? target : 0,
          isValid: errors.length === 0,
          errors,
        });
      });

      if (parsed.length === 0) {
        setError('No data found in the Excel file');
        setIsLoading(false);
        return;
      }

      setParsedData(parsed);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError('Failed to parse Excel file. Please check the format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    const validEntries = parsedData.filter(e => e.isValid);
    
    const entries: ShiftFormData[] = validEntries.map(e => ({
      date: e.date,
      shift: e.shift,
      productionLine: e.productionLine,
      lineLeader: e.lineLeader,
      product: e.product,
      sku: e.sku,
      productionTarget: e.productionTarget,
      realProduction: 0,
      observations: '',
      downtimes: [],
      structuredDowntimes: [],
      staffPlanned: 0,
      staffActual: 0,
    }));

    onImport(entries);
  };

  const validCount = parsedData.filter(e => e.isValid).length;
  const invalidCount = parsedData.filter(e => !e.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={24} className="text-primary" />
            <div>
              <h2 className="font-semibold text-lg">Import Production Plan</h2>
              <p className="text-sm text-muted-foreground">
                Upload Excel file with planned production data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!parsedData.length ? (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-muted transition-colors"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Processing file...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={48} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        Click to upload Excel file
                      </p>
                      <p className="text-sm text-muted-foreground">
                        .xlsx or .xls files supported
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Required Columns */}
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Required Columns:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <span className="px-2 py-1 bg-card rounded">Date</span>
                  <span className="px-2 py-1 bg-card rounded">Shift (DAY/NIGHT)</span>
                  <span className="px-2 py-1 bg-card rounded">Production Line</span>
                  <span className="px-2 py-1 bg-card rounded">Product Name</span>
                  <span className="px-2 py-1 bg-card rounded">Planned Quantity</span>
                  <span className="px-2 py-1 bg-card rounded text-muted-foreground">SKU (optional)</span>
                  <span className="px-2 py-1 bg-card rounded text-muted-foreground">Line Leader (optional)</span>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive flex items-center gap-2">
                  <AlertTriangle size={20} />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-primary" />
                  <span className="font-medium">{fileName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-success flex items-center gap-1">
                    <Check size={16} /> {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertTriangle size={16} /> {invalidCount} errors
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Shift</th>
                        <th className="p-2 text-left">Line</th>
                        <th className="p-2 text-left">Leader</th>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-left">SKU</th>
                        <th className="p-2 text-right">Planned Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((entry, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-t ${!entry.isValid ? 'bg-destructive/10' : 'hover:bg-muted'}`}
                        >
                          <td className="p-2">
                            {entry.isValid ? (
                              <Check size={16} className="text-success" />
                            ) : (
                              <div className="group relative">
                                <AlertTriangle size={16} className="text-destructive" />
                                <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-destructive/10 border border-destructive/30 rounded p-2 text-xs text-destructive w-48 z-10">
                                  {entry.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-2">{entry.date || '-'}</td>
                          <td className="p-2">{entry.shift}</td>
                          <td className="p-2">{entry.productionLine || '-'}</td>
                          <td className="p-2">{entry.lineLeader}</td>
                          <td className="p-2">{entry.product || '-'}</td>
                          <td className="p-2">{entry.sku || '-'}</td>
                          <td className="p-2 text-right">{entry.productionTarget.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          {parsedData.length > 0 && (
            <>
              <button
                onClick={() => {
                  setParsedData([]);
                  setFileName(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="btn-secondary"
              >
                Upload Different File
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="btn-primary"
              >
                <Check size={18} />
                Import {validCount} Entries
              </button>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
