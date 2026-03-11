import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SkuRowForm } from '@/components/SkuRowForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { IntouchImport, LineGroup } from '@/components/IntouchImport';
import { PlanTemplateExport } from '@/components/PlanTemplateExport';
import { PlanImport } from '@/components/PlanImport';
import { ProductCsvUpload } from '@/components/ProductCsvUpload';

import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductLineRecommendations } from '@/hooks/useProductLineRecommendations';
import { ShiftType, SHIFT_TYPES } from '@/types/production';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { Save, RotateCcw, FileSpreadsheet, Package, Users, User, ClipboardCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { naturalLineSort } from '@/utils/naturalLineSort';


interface PlannerFormState {
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  skuRows: SkuRow[];
  observations: string;
  monitoringPhoto?: string;
  photoFilename?: string;
  staffPlanned: number;
  staffActual: number;
}

const createInitialState = (): PlannerFormState => ({
  date: new Date().toISOString().split('T')[0],
  shift: 'DAY',
  productionLine: '',
  lineLeader: '',
  skuRows: [createEmptySkuRow()],
  observations: '',
  monitoringPhoto: undefined,
  photoFilename: undefined,
  staffPlanned: 0,
  staffActual: 0,
});

export function Planner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { saveSession, updateSession, getSessionById, refreshSessions, sessions } = useShifts();
  const { user, hasRole } = useAuth();
  const { getTopLinesForProduct } = useProductLineRecommendations();

  const { uniqueLines, uniqueLeaders } = useMemo(() => {
    const lines = [...new Set(sessions.map(s => s.productionLine.trim()).filter(Boolean))].sort(naturalLineSort);
    const leaders = [...new Set(sessions.map(s => s.lineLeader.trim()).filter(Boolean))].sort();
    return { uniqueLines: lines, uniqueLeaders: leaders };
  }, [sessions]);

  const [formState, setFormState] = useState<PlannerFormState>(createInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showProductUpload, setShowProductUpload] = useState(false);
  const [showIntouchImport, setShowIntouchImport] = useState(false);
  const [showPlanImport, setShowPlanImport] = useState(false);
  

  // Alert when user picks a low-score line for a product
  const prevLineRef = useRef('');
  useEffect(() => {
    const line = formState.productionLine.trim();
    if (!line || line === prevLineRef.current) return;
    prevLineRef.current = line;
    const firstSku = formState.skuRows.find(r => r.sku.trim())?.sku.trim();
    if (!firstSku) return;
    const top = getTopLinesForProduct(firstSku, 100);
    const match = top.find(m => m.line.toLowerCase() === line.toLowerCase());
    if (match && match.score < 50) {
      toast.warning(`⚠️ Atenção: ${firstSku} tem histórico de baixa performance em ${line} (score: ${match.score.toFixed(0)}). Verifique downtimes recentes.`);
    }
  }, [formState.productionLine, formState.skuRows, getTopLinesForProduct]);

  const isOperator = user?.role === 'operator';
  const canReview = hasRole(['supervisor', 'admin']);

  // Load existing session data for editing
  useEffect(() => {
    if (editId) {
      const session = getSessionById(editId);
      if (session) {
        setFormState({
          date: session.date,
          shift: session.shift,
          productionLine: session.productionLine,
          lineLeader: session.lineLeader,
          skuRows: session.items.length > 0 
            ? session.items.map(item => ({
                id: item.id,
                sku: item.sku,
                product: item.productName,
                productionTarget: item.quantityTarget,
                realProduction: item.quantityActual,
                isFoundInDb: true,
                batchNumber: '',
                blenderSize: 0,
                weightPerUnit: 0,
              }))
            : [createEmptySkuRow()],
          observations: session.comments,
          monitoringPhoto: session.monitoringPhoto,
          photoFilename: session.photoFilename,
          staffPlanned: session.staffPlanned || 0,
          staffActual: session.staffActual || 0,
        });
      }
    }
  }, [editId, getSessionById]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSkuRowsChange = (rows: SkuRow[]) => {
    setFormState(prev => ({ ...prev, skuRows: rows }));
  };

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setFormState(prev => ({ ...prev, monitoringPhoto: photo, photoFilename: filename }));
  };

  const handleExcelImport = async (entries: any[]) => {
    // Excel import creates individual sessions per entry
    let hasError = false;
    for (const entry of entries) {
      const result = await saveSession({
        date: entry.date,
        shift: entry.shift,
        productionLine: entry.productionLine,
        lineLeader: entry.lineLeader,
        plannedQuantity: entry.productionTarget || 0,
        items: [{ sku: entry.sku, productName: entry.product, quantityTarget: entry.productionTarget || 0, quantityActual: entry.realProduction || 0 }],
        comments: entry.observations || '',
        staffPlanned: entry.staffPlanned || 0,
        staffActual: entry.staffActual || 0,
      });
      if (!result.success) {
        toast.error(`Failed to import: ${result.error}`);
        hasError = true;
        break;
      }
    }
    if (!hasError) {
      toast.success('Import completed successfully!');
      setShowExcelUpload(false);
      navigate('/history');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formState.date) newErrors.date = 'Date is required';
    if (!formState.productionLine.trim()) newErrors.productionLine = 'Production Line is required';
    if (!formState.lineLeader.trim()) newErrors.lineLeader = 'Line Leader is required';
    if (formState.skuRows.length === 0) {
      newErrors.skuRows = 'At least one product is required';
    } else {
      const skuCounts = new Map<string, number>();
      formState.skuRows.forEach(row => {
        const key = row.sku.trim().toLowerCase();
        if (key) skuCounts.set(key, (skuCounts.get(key) || 0) + 1);
      });
      const duplicates = [...skuCounts.entries()].filter(([, c]) => c > 1).map(([k]) => k);
      if (duplicates.length > 0) {
        newErrors.skuRows = `Duplicate SKUs: ${duplicates.join(', ')}. Each SKU can only appear once per session.`;
      }
      formState.skuRows.forEach(row => {
        if (!row.sku.trim()) newErrors[`sku_${row.id}`] = 'SKU is required';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Client-side duplicate check (DB has unique constraint too)
      if (!editId) {
        const duplicate = sessions.find(
          s => s.productionLine.trim().toLowerCase() === formState.productionLine.trim().toLowerCase()
            && s.date === formState.date
            && s.shift === formState.shift
        );
        if (duplicate) {
          toast.error(`A session for ${formState.productionLine.trim()} on ${formState.date} (${formState.shift}) already exists. Edit it from History instead.`);
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }
      }

      // Batch save new products to catalog
      const newProductRows = formState.skuRows.filter(r => r.isNewProduct && r.sku.trim() && r.product.trim());
      if (newProductRows.length > 0) {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('product_code')
          .in('product_code', newProductRows.map(r => r.sku));
        const existingCodes = new Set((existingProducts || []).map(p => p.product_code));
        const toInsert = newProductRows.filter(r => !existingCodes.has(r.sku));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(
            toInsert.map(r => ({ product_code: r.sku, product_description: r.product }))
          );
          if (error) {
            console.error('Error saving new products:', error);
            toast.error('Failed to save new products to catalog');
          } else {
            toast.success(`${toInsert.length} new product(s) saved to catalog`);
          }
        }
      }

      const validRows = formState.skuRows.filter(row => row.sku.trim());
      if (validRows.length === 0) {
        toast.error('At least one SKU is required');
        return;
      }

      // Calculate total planned quantity from all SKU targets
      const totalPlanned = validRows.reduce((sum, row) => sum + (row.productionTarget || 0), 0);

      const sessionData = {
        date: formState.date,
        shift: formState.shift,
        productionLine: formState.productionLine.trim(),
        lineLeader: formState.lineLeader.trim(),
        plannedQuantity: totalPlanned,
        items: validRows.map(row => ({
          sku: row.sku,
          productName: row.product,
          quantityTarget: row.productionTarget || 0,
          quantityActual: row.realProduction || 0,
        })),
        comments: formState.observations,
        monitoringPhoto: formState.monitoringPhoto,
        photoFilename: formState.photoFilename,
        staffPlanned: formState.staffPlanned,
        staffActual: formState.staffActual,
      };

      let result;
      if (editId) {
        result = await updateSession(editId, sessionData);
      } else {
        result = await saveSession(sessionData);
      }

      if (!result.success) {
        toast.error(`Failed to save: ${result.error}`);
        return;
      }

      toast.success(editId ? 'Session updated successfully!' : 'Production session saved!');
      navigate('/history');
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleReset = () => {
    setFormState(createInitialState());
    setErrors({});
  };

  return (
    <>
      <Header
        title={editId ? 'Edit Production Session' : 'New Production Session'}
        subtitle={isOperator ? 'Enter planned production data' : 'Record and review production data'}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {canReview && (
            <div className="flex flex-wrap gap-2 justify-end">
              <PlanTemplateExport />
              <button type="button" onClick={() => setShowPlanImport(true)} className="btn-secondary">
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">Import Plan</span>
              </button>
              <button type="button" onClick={() => setShowProductUpload(true)} className="btn-secondary">
                <Package size={18} />
                <span className="hidden sm:inline">Import Products</span>
              </button>
              <button onClick={() => setShowExcelUpload(true)} className="btn-secondary">
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">Import Sessions</span>
              </button>
              <button onClick={() => setShowIntouchImport(true)} className="btn-secondary">
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">Import iTouching</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shift Information Card */}
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                <User size={20} className="text-primary" />
                Shift Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="date" className="label">Date <span className="text-destructive">*</span></label>
                  <input type="date" id="date" name="date" value={formState.date} onChange={handleFieldChange}
                    className={`input-field ${errors.date ? 'border-destructive' : ''}`} />
                  {errors.date && <p className="text-sm text-destructive mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label htmlFor="shift" className="label">Shift</label>
                  <select id="shift" name="shift" value={formState.shift} onChange={handleFieldChange} className="select-field">
                    {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="productionLine" className="label">Production Line <span className="text-destructive">*</span></label>
                  <input type="text" id="productionLine" name="productionLine" value={formState.productionLine}
                    onChange={handleFieldChange} placeholder="e.g., Filler Line 1" list="line-options"
                    className={`input-field ${errors.productionLine ? 'border-destructive' : ''}`} maxLength={50} />
                  <datalist id="line-options">
                    {uniqueLines.map(l => <option key={l} value={l} />)}
                  </datalist>
                  {errors.productionLine && <p className="text-sm text-destructive mt-1">{errors.productionLine}</p>}
                </div>
                <div>
                  <label htmlFor="lineLeader" className="label">Line Leader <span className="text-destructive">*</span></label>
                  <input type="text" id="lineLeader" name="lineLeader" value={formState.lineLeader}
                    onChange={handleFieldChange} placeholder="Leader name" list="leader-options"
                    className={`input-field ${errors.lineLeader ? 'border-destructive' : ''}`} maxLength={100} />
                  <datalist id="leader-options">
                    {uniqueLeaders.map(l => <option key={l} value={l} />)}
                  </datalist>
                  {errors.lineLeader && <p className="text-sm text-destructive mt-1">{errors.lineLeader}</p>}
                </div>
              </div>
            </div>

            {/* SKU Rows */}
            <div className="card p-4 sm:p-6">
              <SkuRowForm
                skuRows={formState.skuRows}
                onChange={handleSkuRowsChange}
                canReview={canReview}
                errors={errors}
                productionLine={formState.productionLine.trim()}
              />
              {errors.skuRows && <p className="text-sm text-destructive mt-2">{errors.skuRows}</p>}
            </div>

            {/* Staffing */}
            {canReview && (
              <div className="card p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                  <Users size={20} className="text-primary" />
                  Staffing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="staffPlanned" className="label">Staff Planned</label>
                    <input type="number" id="staffPlanned" name="staffPlanned" value={formState.staffPlanned || ''}
                      onChange={handleFieldChange} min="0" placeholder="0" className="input-field" />
                  </div>
                  <div>
                    <label htmlFor="staffActual" className="label">Staff Actual</label>
                    <input type="number" id="staffActual" name="staffActual" value={formState.staffActual || ''}
                      onChange={handleFieldChange} min="0" placeholder="0" className="input-field" />
                  </div>
                </div>
              </div>
            )}

            {/* Review Section */}
            <div className={`card p-4 sm:p-6 border-l-4 ${canReview ? 'border-l-primary' : 'border-l-muted'}`}>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                <ClipboardCheck size={20} className={canReview ? 'text-primary' : 'text-muted-foreground'} />
                Production Review
                {!canReview && (
                  <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
                    <Lock size={14} />Supervisor access required
                  </span>
                )}
              </h3>
              <div className={`${!canReview ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="mb-6">
                  <label htmlFor="observations" className="label">Comments / Observations</label>
                  <textarea id="observations" name="observations" value={formState.observations}
                    onChange={handleFieldChange} rows={3} placeholder="Additional notes about the shift..."
                    className="input-field resize-none" maxLength={500} disabled={!canReview} />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <PhotoUpload photo={formState.monitoringPhoto} filename={formState.photoFilename} onChange={handlePhotoChange} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-end">
              <button type="button" onClick={handleReset} className="btn-secondary" disabled={isSubmitting}>
                <RotateCcw size={18} /> Reset
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="animate-spin">⏳</span> Saving...</>
                ) : (
                  <><Save size={18} /> {editId ? 'Update Session' : 'Save Session'}</>
                )}
              </button>
            </div>
          </form>

          {showExcelUpload && (
            <ExcelUpload onImport={handleExcelImport} onClose={() => setShowExcelUpload(false)} />
          )}
          {showProductUpload && (
            <ProductCsvUpload onClose={() => setShowProductUpload(false)} />
          )}
          <IntouchImport
            open={showIntouchImport}
            onClose={() => setShowIntouchImport(false)}
            onImport={async (groups: LineGroup[], importDate: string, importShift: ShiftType) => {
              const results = await Promise.allSettled(
                groups.map(group => {
                  const totalPlanned = group.rows.reduce((sum, r) => sum + r.quantityTarget, 0);
                  return saveSession({
                    date: importDate,
                    shift: importShift,
                    productionLine: group.line,
                    lineLeader: group.lineLeader,
                    plannedQuantity: totalPlanned,
                    items: group.rows.map(r => ({
                      sku: r.sku,
                      productName: r.product,
                      quantityTarget: r.quantityTarget,
                      quantityActual: 0,
                    })),
                    comments: '',
                    structuredDowntimes: group.downtimes?.map(d => ({
                      id: crypto.randomUUID(),
                      category: d.category,
                      reason: d.reason,
                      duration: d.duration,
                      comment: d.comment,
                    })),
                    staffPlanned: 0,
                    staffActual: 0,
                  }, { skipRefresh: true });
                })
              );

              const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
              const dtCount = groups.reduce((sum, g) => sum + (g.downtimes?.length || 0), 0);
              if (failures.length > 0) {
                toast.error(`Failed to import ${failures.length} line(s)`);
              } else {
                toast.success(`Imported ${groups.length} line(s)${dtCount > 0 ? ` with ${dtCount} downtime(s)` : ''} successfully!`);
              }

              await refreshSessions();
              setShowIntouchImport(false);
              navigate('/history');
            }}
          />
          <PlanImport
            open={showPlanImport}
            onClose={() => setShowPlanImport(false)}
            onImported={() => navigate('/history')}
          />
        </div>
      </div>
    </>
  );
}
