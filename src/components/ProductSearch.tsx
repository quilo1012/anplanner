import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Product {
  product_code: string;
  product_description: string;
}

interface ProductSearchProps {
  value: string;
  onChange: (sku: string, product?: { sku: string; name: string }) => void;
  onFoundStatusChange?: (found: boolean) => void;  // Callback when SKU found status changes
  disabled?: boolean;
  placeholder?: string;
}

export function ProductSearch({ value, onChange, onFoundStatusChange, disabled, placeholder = "Type SKU to search..." }: ProductSearchProps) {
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
          .select('product_code, product_description')
          .or(`product_code.ilike.%${query}%,product_description.ilike.%${query}%`)
          .order('product_code')
          .limit(10);

        if (error) {
          console.error('Error searching products:', error);
          return;
        }

        setResults(data || []);
        
        // Check if exact SKU match exists
        const exactMatch = data?.find(p => p.product_code.toLowerCase() === query.toLowerCase());
        const isFound = !!exactMatch;
        setSkuNotFound(!isFound && query.length >= 2);
        
        // Notify parent of found status
        onFoundStatusChange?.(isFound);
        
        if (exactMatch && !selectedProduct) {
          // Auto-select if exact match
          setSelectedProduct(exactMatch);
          onChange(exactMatch.product_code, { 
            sku: exactMatch.product_code, 
            name: exactMatch.product_description 
          });
        }
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setIsOpen(true);
    setSelectedProduct(null);
    setSkuNotFound(false);
    onFoundStatusChange?.(false);  // Reset found status on change
    onChange(newValue);
  };

  const handleSelectProduct = (product: Product) => {
    setQuery(product.product_code);
    setSelectedProduct(product);
    setSkuNotFound(false);
    setIsOpen(false);
    onFoundStatusChange?.(true);  // Found in DB
    onChange(product.product_code, { 
      sku: product.product_code, 
      name: product.product_description 
    });
  };

  const handleFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={`input-field pl-9 pr-8 ${skuNotFound && hasSearched && !isOpen ? 'border-warning' : ''}`}
          maxLength={50}
        />
        {isLoading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* SKU not found warning */}
      {skuNotFound && hasSearched && !isOpen && !selectedProduct && query.length >= 2 && (
        <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-md flex items-center gap-2">
          <AlertTriangle size={14} className="text-warning flex-shrink-0" />
          <span className="text-sm text-warning">
            SKU not found in product database
          </span>
          <Badge variant="outline" className="ml-auto text-xs bg-background">
            Manual entry allowed
          </Badge>
        </div>
      )}

      {/* Selected product info */}
      {selectedProduct && (
        <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-success" />
            <span className="font-medium text-success">{selectedProduct.product_description}</span>
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map(product => (
            <button
              key={product.product_code}
              type="button"
              onClick={() => handleSelectProduct(product)}
              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-start gap-3"
            >
              <Package size={16} className="mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-primary">
                    {product.product_code}
                  </span>
                </div>
                <p className="text-sm text-foreground truncate">
                  {product.product_description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle size={14} className="text-warning" />
            <span>No products found for "<strong>{query}</strong>"</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            You can still enter the product name manually
          </p>
        </div>
      )}
    </div>
  );
}
