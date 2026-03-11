import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProductCache } from '@/hooks/useProductCache';

interface Product {
  product_code: string;
  product_description: string;
  weight_per_unit?: number;
}

interface ProductSearchProps {
  value: string;
  onChange: (sku: string, product?: { sku: string; name: string }) => void;
  onFoundStatusChange?: (found: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Highlight matching text in a string
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 1) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function ProductSearch({ value, onChange, onFoundStatusChange, disabled, placeholder = "Type SKU to search..." }: ProductSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [skuNotFound, setSkuNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFoundStatusChangeRef = useRef(onFoundStatusChange);
  onFoundStatusChangeRef.current = onFoundStatusChange;
  
  const { searchProducts, isLoaded: cacheLoaded } = useProductCache();

  // Sync external value
  useEffect(() => {
    if (value !== query) setQuery(value);
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

  // Search products — 30ms debounce, 1 char minimum
  useEffect(() => {
    if (query.length < 1) {
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
      const formattedResults: Product[] = cachedResults.map(p => ({
        product_code: p.sku,
        product_description: p.name,
      }));
      setResults(formattedResults);
      setActiveIndex(-1);

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
    }, 30);

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

  const handleSelectProduct = useCallback((product: Product) => {
    setQuery(product.product_code);
    setSelectedProduct(product);
    setSkuNotFound(false);
    setIsOpen(false);
    onFoundStatusChangeRef.current?.(true);
    onChangeRef.current(product.product_code, { 
      sku: product.product_code, 
      name: product.product_description,
    });
  }, []);

  const handleFocus = () => {
    if (query.length >= 1) setIsOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectProduct(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen, results, activeIndex, handleSelectProduct]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-search-item]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

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
          onKeyDown={handleKeyDown}
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
      {skuNotFound && hasSearched && !isOpen && !selectedProduct && query.length >= 1 && (
        <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-md flex items-center gap-2">
          <AlertTriangle size={14} className="text-warning flex-shrink-0" />
          <span className="text-sm text-warning">SKU not found in product database</span>
          <Badge variant="outline" className="ml-auto text-xs bg-background">Manual entry allowed</Badge>
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
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-72 overflow-auto">
          {results.map((product, idx) => (
            <button
              key={product.product_code}
              type="button"
              data-search-item
              onClick={() => handleSelectProduct(product)}
              className={`w-full px-3 py-2.5 text-left transition-colors flex items-center gap-3 ${
                idx === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
            >
              <Package size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm font-bold text-primary">
                  <HighlightMatch text={product.product_code} query={query} />
                </span>
                <span className="text-muted-foreground mx-1.5">—</span>
                <span className="text-sm text-foreground">
                  <HighlightMatch text={product.product_description} query={query} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 1 && results.length === 0 && !isLoading && hasSearched && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle size={14} className="text-warning" />
            <span>No products found for "<strong>{query}</strong>"</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">You can still enter the product name manually</p>
        </div>
      )}
    </div>
  );
}
