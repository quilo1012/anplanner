import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface ProductCsvUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedProduct {
  sku: string;
  name: string;
  price?: number;
  description?: string;
}

export function ProductCsvUpload({ onClose, onSuccess }: ProductCsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedProduct[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const skuIndex = header.findIndex(h => h === 'sku' || h === 'código' || h === 'codigo');
    const nameIndex = header.findIndex(h => h === 'name' || h === 'nome' || h === 'product' || h === 'produto');
    const priceIndex = header.findIndex(h => h === 'price' || h === 'preço' || h === 'preco' || h === 'valor');
    const descIndex = header.findIndex(h => h === 'description' || h === 'descrição' || h === 'descricao' || h === 'desc');

    if (skuIndex === -1) {
      throw new Error('CSV must have a "sku" or "codigo" column');
    }
    if (nameIndex === -1) {
      throw new Error('CSV must have a "name" or "nome" column');
    }

    const products: ParsedProduct[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle quoted values with commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      const sku = values[skuIndex]?.trim();
      const name = values[nameIndex]?.trim();

      if (sku && name) {
        const product: ParsedProduct = { sku, name };
        
        if (priceIndex !== -1 && values[priceIndex]) {
          const price = parseFloat(values[priceIndex].replace(/[^0-9.-]/g, ''));
          if (!isNaN(price)) {
            product.price = price;
          }
        }
        
        if (descIndex !== -1 && values[descIndex]) {
          product.description = values[descIndex];
        }

        products.push(product);
      }
    }

    return products;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const content = await file.text();
      const products = parseCSV(content);

      if (products.length === 0) {
        throw new Error('No valid products found in CSV');
      }

      // Insert products in batches
      const batchSize = 100;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('products')
          .upsert(
            batch.map(p => ({
              sku: p.sku,
              name: p.name,
              price: p.price || null,
              description: p.description || null,
            })),
            { onConflict: 'sku', ignoreDuplicates: false }
          );

        if (insertError) {
          console.error('Batch insert error:', insertError);
          failedCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      setResult({ success: successCount, failed: failedCount });
      
      if (successCount > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
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
      <div className="bg-[hsl(var(--card))] rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="font-semibold text-lg">Import Products from CSV</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} className="text-[hsl(var(--primary))]" />
                </div>
                <h4 className="font-medium mb-2">Upload CSV File</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  CSV must have columns: <strong>sku</strong> and <strong>name</strong>
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Optional columns: price, description
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
                <div className={`border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center cursor-pointer hover:border-[hsl(var(--primary))] transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[hsl(var(--primary))]" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm">Click to select CSV file</span>
                    </div>
                  )}
                </div>
              </label>

              {error && (
                <div className="mt-4 p-3 bg-[hsl(0,85%,95%)] border border-[hsl(0,60%,85%)] rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-[hsl(var(--destructive))] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.failed === 0 ? 'bg-[hsl(145,65%,92%)]' : 'bg-[hsl(40,95%,90%)]'
              }`}>
                <CheckCircle size={32} className={result.failed === 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(40,80%,40%)]'} />
              </div>
              <h4 className="font-medium mb-2">Import Complete</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                <span className="text-[hsl(var(--success))] font-medium">{result.success}</span> products imported successfully
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-[hsl(var(--destructive))] mt-1">
                  {result.failed} products failed
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[hsl(var(--border))] flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
