import { useState, useEffect, useRef } from 'react';
import { Search, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProductCache } from '@/hooks/useProductCache';

interface Product {
  product_code: string;
  product_description: string;
}

interface ProductSearchProps {
  value: string;
  onChange: (sku: string, product?: { sku: string; name: string }) => void;
  onFoundStatusChange?: (found: boolean) => void;
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

  // Stable refs to avoid stale closures in debounced effect
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFoundStatusChangeRef = useRef(onFoundStatusChange);
  onFoundStatusChangeRef.current = onFoundStatusChange;
  
  const { searchProducts, hasProduct, getProduct, isLoaded: cacheLoaded, loadProducts } = useProductCache();

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

  // Search products - pure in-memory, no DB fallback
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSkuNotFound(false);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    if (!cacheLoaded) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      setHasSearched(true);
      const cachedResults = searchProducts(query);
      const formattedResults = cachedResults.map(p => ({
        product_code: p.sku,
        product_description: p.name,
      }));
      setResults(formattedResults);

      const exactMatch = cachedResults.find(
        p => p.sku.toLowerCase() === query.toLowerCase()
      );
      setSkuNotFound(!exactMatch);
      onFoundStatusChangeRef.current?.(!!exactMatch);

      if (exactMatch && !selectedProduct) {
        setSelectedProduct({
          product_code: exactMatch.sku,
          product_description: exactMatch.name,
        });
        onChangeRef.current(exactMatch.sku, { sku: exactMatch.sku, name: exactMatch.name });
      }
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cacheLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setIsOpen(true);
    setSelectedProduct(null);
    setSkuNotFound(false);
    onFoundStatusChangeRef.current?.(false);
    onChangeRef.current(newValue);
  };

  const handleSelectProduct = (product: Product) => {
    setQuery(product.product_code);
    setSelectedProduct(product);
    setSkuNotFound(false);
    setIsOpen(false);
    onFoundStatusChangeRef.current?.(true);
    onChangeRef.current(product.product_code, { 
      sku: product.product_code, 
      name: product.product_description,
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
