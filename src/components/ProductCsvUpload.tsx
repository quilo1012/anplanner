import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProductCsvUploadProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedProduct {
  product_code: string;
  product_description: string;
}

// Header aliases for flexible column matching
const CODE_ALIASES = ['sku', 'codigo', 'código', 'code', 'product code', 'product_code', 'productcode', 'item code', 'item_code'];
const DESC_ALIASES = ['name', 'nome', 'product', 'produto', 'product description', 'description', 'product name', 'product_name', 'productname', 'item', 'item name', 'descrição', 'descricao'];

// Remove BOM and invisible characters from string
function cleanString(str: string): string {
  return str
    .replace(/^\uFEFF/, '') // Remove UTF-8 BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/[""'']/g, '"') // Normalize quotes
    .trim();
}

// Normalize header for matching
function normalizeHeader(header: string): string {
  return cleanString(header)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .trim();
}

// Find column index by checking against aliases
function findColumnIndex(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
      return i;
    }
  }
  return -1;
}

export function ProductCsvUpload({ onClose, onSuccess }: ProductCsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const skippedRowsRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): { products: ParsedProduct[]; skippedRows: number } => {
    // Remove BOM from content start
    const cleanContent = cleanString(content);
    
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header with normalization
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    const codeIndex = findColumnIndex(headers, CODE_ALIASES);
    const descIndex = findColumnIndex(headers, DESC_ALIASES);

    if (codeIndex === -1) {
      throw new Error('CSV must have a Code/SKU column (e.g., "sku", "codigo", "code", "product_code")');
    }
    if (descIndex === -1) {
      throw new Error('CSV must have a Description column (e.g., "name", "product", "description")');
    }

    // Use Map for deduplication (last occurrence wins)
    const productMap = new Map<string, ParsedProduct>();
    let skippedRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = parseCSVLine(line);

        const product_code = cleanString(values[codeIndex] || '');
        const product_description = cleanString(values[descIndex] || '');

        // Skip rows with empty code or description
        if (!product_code || !product_description) {
          skippedRows++;
          continue;
        }

        const product: ParsedProduct = { product_code, product_description };

        // Store in map (overwrites duplicates)
        productMap.set(product_code.toLowerCase(), product);
      } catch (rowError) {
        console.warn(`Skipping malformed row ${i + 1}:`, rowError);
        skippedRows++;
      }
    }

    if (skippedRows > 0) {
      console.warn(`Skipped ${skippedRows} rows due to missing/invalid data`);
    }

    return { products: Array.from(productMap.values()), skippedRows };
  };

  // Parse a single CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Clean up values (remove surrounding quotes)
    return values.map(v => v.replace(/^["']|["']$/g, '').trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setIsUploading(true);
    setProgress(0);
    setProgressText('Reading file...');

    try {
      const content = await file.text();
      setProgress(10);
      setProgressText('Parsing CSV...');
      
      const { products, skippedRows } = parseCSV(content);
      skippedRowsRef.current = skippedRows;

      if (products.length === 0) {
        throw new Error('No valid products found in CSV. Ensure columns for code/SKU and description/name exist with data.');
      }

      setProgress(20);
      setProgressText(`Found ${products.length} unique products. Uploading...`);

      // Insert products in batches
      const batchSize = 100;
      let successCount = 0;
      let failedCount = 0;
      const totalBatches = Math.ceil(products.length / batchSize);

      for (let i = 0; i < products.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = products.slice(i, i + batchSize);
        
        setProgressText(`Uploading batch ${batchNum}/${totalBatches}...`);
        
        try {
          const { error: insertError } = await supabase
            .from('products')
            .upsert(
              batch.map(p => ({
                product_code: p.product_code,
                product_description: p.product_description,
              })),
              { onConflict: 'product_code', ignoreDuplicates: false }
            );

          if (insertError) {
            console.error('Batch insert error:', insertError);
            failedCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error('Batch error:', batchError);
          failedCount += batch.length;
        }
        
        // Update progress (20-90% range for uploads)
        const uploadProgress = 20 + (70 * (i + batch.length) / products.length);
        setProgress(Math.min(90, uploadProgress));
      }

      setProgress(100);
      setProgressText('Complete!');
      setResult({ success: successCount, failed: failedCount, skipped: skippedRowsRef.current });
      
      if (successCount > 0 && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('CSV processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process CSV');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-lg">Import Products from CSV</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} className="text-primary" />
                </div>
                <h4 className="font-medium mb-2">Upload CSV File</h4>
                <p className="text-sm text-muted-foreground">
                  Required columns: <strong>product_code</strong> (or SKU) and <strong>product_description</strong> (or name)
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Accepts various header formats (SKU, Codigo, Code, Name, Description, etc.)
                </p>
              </div>

              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className={`border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-sm">{progressText}</span>
                      <Progress value={progress} className="w-full h-2" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-sm">Click to select CSV file</span>
                      <span className="text-xs text-muted-foreground">
                        Supports 1000+ products
                      </span>
                    </div>
                  )}
                </div>
              </label>

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.failed === 0 ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                <CheckCircle size={32} className={result.failed === 0 ? 'text-success' : 'text-warning'} />
              </div>
              <h4 className="font-medium mb-2">Import Complete</h4>
              <p className="text-sm text-muted-foreground">
                <span className="text-success font-medium">{result.success}</span> products imported successfully
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {result.failed} products failed
                </p>
              )}
              {result.skipped > 0 && (
                <p className="text-sm text-warning mt-1">
                  {result.skipped} linhas ignoradas por dados ausentes/inválidos
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
