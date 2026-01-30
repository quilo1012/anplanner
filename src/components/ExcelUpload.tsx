import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Check, AlertTriangle } from 'lucide-react';
import { ShiftFormData, ShiftType, SHIFT_TYPES } from '@/types/shift';

interface ExcelRow {
  Date: string;
  Shift: string;
  'Production Line': string;
  'Line Leader'?: string;
  'Product Name': string;
  SKU?: string;
  'Planned Quantity': number;
}

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

  const parseDate = (value: any): string | null => {
    if (!value) return null;
    
    // If it's already a string in YYYY-MM-DD format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // If it's a number (Excel date serial)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    
    // Try parsing as date string
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  };

  const parseShift = (value: any): ShiftType | null => {
    if (!value) return null;
    const normalized = String(value).toUpperCase().trim();
    if (normalized === 'A') return 'A';
    if (normalized === 'B') return 'B';
    if (normalized === 'C') return 'C';
    // Legacy mapping
    if (normalized === 'DAY' || normalized === 'D') return 'A';
    if (normalized === 'NIGHT' || normalized === 'N') return 'B';
    return null;
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
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      if (jsonData.length === 0) {
        setError('No data found in the Excel file');
        setIsLoading(false);
        return;
      }

      // Parse and validate each row
      const parsed: ParsedEntry[] = jsonData.map((row) => {
        const errors: string[] = [];
        
        const date = parseDate(row.Date);
        if (!date) errors.push('Invalid or missing Date');
        
        const shift = parseShift(row.Shift);
        if (!shift) errors.push('Invalid Shift (use A/B/C)');
        
        const productionLine = row['Production Line']?.toString().trim();
        if (!productionLine) errors.push('Missing Production Line');
        
        const product = row['Product Name']?.toString().trim();
        if (!product) errors.push('Missing Product Name');
        
        const target = Number(row['Planned Quantity']);
        if (isNaN(target) || target <= 0) errors.push('Invalid Planned Quantity');

        return {
          date: date || '',
          shift: shift || 'A',
          productionLine: productionLine || '',
          lineLeader: row['Line Leader']?.toString().trim() || 'TBD',
          product: product || '',
          sku: row.SKU?.toString().trim() || '',
          productionTarget: target > 0 ? target : 0,
          isValid: errors.length === 0,
          errors,
        };
      });

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
                  <span className="px-2 py-1 bg-card rounded">Shift (A/B/C)</span>
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
                          <td className="p-2">Shift {entry.shift}</td>
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
