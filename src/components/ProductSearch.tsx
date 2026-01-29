import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  description: string | null;
}

interface ProductSearchProps {
  value: string;
  onChange: (sku: string, product?: Product) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ProductSearch({ value, onChange, disabled, placeholder = "Type SKU to search..." }: ProductSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [skuNotFound, setSkuNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults([]);
        setSkuNotFound(false);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
          .order('sku')
          .limit(10);

        if (error) {
          console.error('Error searching products:', error);
          return;
        }

        setResults(data || []);
        
        // Check if exact SKU match exists
        const exactMatch = data?.find(p => p.sku.toLowerCase() === query.toLowerCase());
        setSkuNotFound(!exactMatch && query.length >= 2);
        
        if (exactMatch && !selectedProduct) {
          // Auto-select if exact match
          setSelectedProduct(exactMatch);
          onChange(exactMatch.sku, exactMatch);
        }
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setIsOpen(true);
    setSelectedProduct(null);
    setSkuNotFound(false);
    onChange(newValue);
  };

  const handleSelectProduct = (product: Product) => {
    setQuery(product.sku);
    setSelectedProduct(product);
    setSkuNotFound(false);
    setIsOpen(false);
    onChange(product.sku, product);
  };

  const handleFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={`input-field pl-9 pr-8 ${skuNotFound && hasSearched && !isOpen ? 'border-[hsl(var(--warning))]' : ''}`}
          maxLength={50}
        />
        {isLoading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] animate-spin" />
        )}
      </div>

      {/* SKU not found warning */}
      {skuNotFound && hasSearched && !isOpen && !selectedProduct && query.length >= 2 && (
        <div className="mt-2 p-2 bg-[hsl(40,95%,90%)] border border-[hsl(40,80%,70%)] rounded-md flex items-center gap-2">
          <AlertTriangle size={14} className="text-[hsl(var(--warning-foreground))] flex-shrink-0" />
          <span className="text-sm text-[hsl(var(--warning-foreground))]">
            SKU not found in product database
          </span>
          <Badge variant="outline" className="ml-auto text-xs bg-[hsl(var(--background))]">
            Manual entry allowed
          </Badge>
        </div>
      )}

      {/* Selected product info */}
      {selectedProduct && (
        <div className="mt-2 p-2 bg-[hsl(145,65%,95%)] border border-[hsl(145,50%,80%)] rounded-md text-sm">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-[hsl(var(--success))]" />
            <span className="font-medium text-[hsl(var(--success))]">{selectedProduct.name}</span>
          </div>
          {selectedProduct.description && (
            <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 line-clamp-2">
              {selectedProduct.description}
            </p>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map(product => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelectProduct(product)}
              className="w-full px-3 py-2 text-left hover:bg-[hsl(var(--muted))] transition-colors flex items-start gap-3"
            >
              <Package size={16} className="mt-0.5 text-[hsl(var(--muted-foreground))]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-[hsl(var(--primary))]">
                    {product.sku}
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--foreground))] truncate">
                  {product.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md shadow-lg p-3">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <AlertTriangle size={14} className="text-[hsl(40,80%,45%)]" />
            <span>No products found for "<strong>{query}</strong>"</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            You can still enter the product name manually
          </p>
        </div>
      )}
    </div>
  );
}
