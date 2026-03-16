import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { ProductCsvUpload } from '@/components/ProductCsvUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Upload, Edit2, Check, X, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Product {
  product_code: string;
  product_description: string;
  weight_per_unit: number | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ description: '', weight: '' });

  // New product form
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_code', { ascending: true });
    if (error) {
      toast.error('Failed to load products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.product_code.toLowerCase().includes(q) ||
      p.product_description.toLowerCase().includes(q)
    );
  }, [products, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search]);

  const handleAdd = async () => {
    const code = newCode.trim();
    const desc = newDesc.trim();
    if (!code || !desc) { toast.error('SKU and Description are required'); return; }
    if (products.some(p => p.product_code.toLowerCase() === code.toLowerCase())) {
      toast.error('SKU already exists');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('products').insert({
      product_code: code,
      product_description: desc,
      weight_per_unit: parseFloat(newWeight) || 0,
    });
    if (error) {
      toast.error('Failed to add product');
    } else {
      toast.success('Product added');
      setNewCode(''); setNewDesc(''); setNewWeight('');
      setShowAddForm(false);
      fetchProducts();
    }
    setAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('products').delete().eq('product_code', deleteTarget);
    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.product_code !== deleteTarget));
    }
    setDeleteTarget(null);
  };

  const startEdit = (p: Product) => {
    setEditingCode(p.product_code);
    setEditValues({ description: p.product_description, weight: String(p.weight_per_unit || '') });
  };

  const saveEdit = async () => {
    if (!editingCode) return;
    const { error } = await supabase.from('products').update({
      product_description: editValues.description.trim(),
      weight_per_unit: parseFloat(editValues.weight) || 0,
    }).eq('product_code', editingCode);
    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success('Updated');
      setProducts(prev => prev.map(p =>
        p.product_code === editingCode
          ? { ...p, product_description: editValues.description.trim(), weight_per_unit: parseFloat(editValues.weight) || 0 }
          : p
      ));
    }
    setEditingCode(null);
  };

  return (
    <>
      <Header title="Products Database" subtitle="Manage your product catalog" />

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by SKU or description..."
                className="pl-9"
                maxLength={100}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(true)}>
                <Plus size={16} /> Add Product
              </Button>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload size={16} /> Import CSV
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Package size={14} /> {products.length} total products</span>
            {search && <span>{filtered.length} matching</span>}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Weight/Unit (kg)</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {search ? 'No products match your search' : 'No products in database'}
                      </TableCell>
                    </TableRow>
                  ) : paged.map(p => (
                    <TableRow key={p.product_code}>
                      <TableCell className="font-mono text-sm font-medium">{p.product_code}</TableCell>
                      <TableCell>
                        {editingCode === p.product_code ? (
                          <Input
                            value={editValues.description}
                            onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                            className="h-8"
                            maxLength={200}
                          />
                        ) : (
                          <span className="text-sm">{p.product_description}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCode === p.product_code ? (
                          <Input
                            type="number"
                            value={editValues.weight}
                            onChange={e => setEditValues(v => ({ ...v, weight: e.target.value }))}
                            className="h-8 w-24 ml-auto"
                            step="0.001"
                            min="0"
                          />
                        ) : (
                          <span className="text-sm">{p.weight_per_unit || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCode === p.product_code ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                              <Check size={14} className="text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingCode(null)} className="h-7 w-7">
                              <X size={14} className="text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(p)} className="h-7 w-7">
                              <Edit2 size={14} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p.product_code)} className="h-7 w-7 text-destructive">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Add a single product to the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="label text-xs">SKU / Product Code <span className="text-destructive">*</span></label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. SKU-001" maxLength={50} />
            </div>
            <div>
              <label className="label text-xs">Description <span className="text-destructive">*</span></label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Product description" maxLength={200} />
            </div>
            <div>
              <label className="label text-xs">Weight per Unit (kg)</label>
              <Input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="0" step="0.001" min="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import */}
      {showImport && (
        <ProductCsvUpload
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchProducts(); }}
        />
      )}
    </>
  );
}
