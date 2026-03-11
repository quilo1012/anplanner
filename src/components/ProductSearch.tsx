import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProductSearch, lookupExactProduct } from '@/hooks/useProductSearch';

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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [skuNotFound, setSkuNotFound] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [initialLookupDone, setInitialLookupDone] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userEditingRef = useRef(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFoundStatusChangeRef = useRef(onFoundStatusChange);
  onFoundStatusChangeRef.current = onFoundStatusChange;

  // Server-side search with 300ms debounce
  const { results: searchResults, isLoading } = useProductSearch(userEditingRef.current ? query : '');

  const results: Product[] = searchResults.map(p => ({
    product_code: p.product_code,
    product_description: p.product_description,
  }));

  // Initial exact lookup when mounted with a value (e.g. editing history)
  useEffect(() => {
    if (initialLookupDone) return;
    if (!value || value.trim().length < 1) {
      setInitialLookupDone(true);
      return;
    }

    let cancelled = false;
    lookupExactProduct(value).then(product => {
      if (cancelled) return;
      setInitialLookupDone(true);
      if (product) {
        setSelectedProduct({
          product_code: product.product_code,
          product_description: product.product_description,
        });
        setSkuNotFound(false);
        onFoundStatusChangeRef.current?.(true);
        onChangeRef.current(product.product_code, {
          sku: product.product_code,
          name: product.product_description,
        });
      } else {
        setSkuNotFound(true);
        onFoundStatusChangeRef.current?.(false);
      }
    });
    return () => { cancelled = true; };
  }, [value, initialLookupDone]);

  // Sync external value changes (only when not user-editing)
  useEffect(() => {
    if (!userEditingRef.current && value !== query) {
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

  // Update found status when search results change (only during user editing)
  useEffect(() => {
    if (!userEditingRef.current) return;
    if (query.length < 1) {
      setSkuNotFound(false);
      return;
    }
    if (isLoading) return;

    const exactMatch = searchResults.find(
      p => p.product_code.toLowerCase() === query.toLowerCase()
    );
    setSkuNotFound(!exactMatch);
    onFoundStatusChangeRef.current?.(!!exactMatch);

    if (exactMatch && !selectedProduct) {
      setSelectedProduct({
        product_code: exactMatch.product_code,
        product_description: exactMatch.product_description,
      });
      onChangeRef.current(exactMatch.product_code, { sku: exactMatch.product_code, name: exactMatch.product_description });
    }
    setActiveIndex(-1);
  }, [searchResults, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    userEditingRef.current = true;
    setQuery(newValue);
    setIsOpen(true);
    setSelectedProduct(null);
    setSkuNotFound(false);
    onFoundStatusChangeRef.current?.(false);
    onChangeRef.current(newValue);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted) return;
    // Let onChange fire normally, but mark as user editing
    userEditingRef.current = true;
  };

  const handleSelectProduct = useCallback((product: Product) => {
    userEditingRef.current = false;
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
    if (query.length >= 1) {
      userEditingRef.current = true;
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      userEditingRef.current = false;
    }, 200);
  };

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

  const hasSearched = query.length >= 1 && !isLoading;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`input-field pl-9 pr-8 ${skuNotFound && hasSearched && !isOpen ? 'border-warning' : ''}`}
          maxLength={50}
          data-sku-input
        />
        {isLoading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {skuNotFound && hasSearched && !isOpen && !selectedProduct && query.length >= 1 && (
        <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-md flex items-center gap-2">
          <AlertTriangle size={14} className="text-warning flex-shrink-0" />
          <span className="text-sm text-warning">SKU not found in product database</span>
          <Badge variant="outline" className="ml-auto text-xs bg-background">Manual entry allowed</Badge>
        </div>
      )}

      {selectedProduct && (
        <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-success" />
            <span className="font-medium text-success">{selectedProduct.product_description}</span>
          </div>
        </div>
      )}

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

      {isOpen && query.length >= 1 && results.length === 0 && !isLoading && (
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
