import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { SkuRowForm } from '@/components/SkuRowForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ProductCsvUpload } from '@/components/ProductCsvUpload';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftFormData, ShiftType, StructuredDowntime, SHIFT_TYPES } from '@/types/shift';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import { Save, RotateCcw, FileSpreadsheet, Package, Users, User, ClipboardCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlannerFormState {
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  skuRows: SkuRow[];
  observations: string;
  structuredDowntimes: StructuredDowntime[];
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
  structuredDowntimes: [],
  monitoringPhoto: undefined,
  photoFilename: undefined,
  staffPlanned: 0,
  staffActual: 0,
});

export function Planner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { addShift, updateShift, getShiftById } = useShifts();
  const { user, hasRole } = useAuth();
  const [formState, setFormState] = useState<PlannerFormState>(createInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showProductUpload, setShowProductUpload] = useState(false);

  const isOperator = user?.role === 'operator';
  const canReview = hasRole(['supervisor', 'admin']);

  // Load existing shift data for editing
  useEffect(() => {
    if (editId) {
      const shift = getShiftById(editId);
      if (shift) {
        setFormState({
          date: shift.date,
          shift: shift.shift,
          productionLine: shift.productionLine,
          lineLeader: shift.lineLeader,
          skuRows: [{
            id: editId,
            sku: shift.sku,
            product: shift.product,
            productionTarget: shift.productionTarget || 0,
            realProduction: shift.realProduction || 0,
          }],
          observations: shift.observations,
          structuredDowntimes: shift.structuredDowntimes || [],
          monitoringPhoto: shift.monitoringPhoto,
          photoFilename: shift.photoFilename,
          staffPlanned: shift.staffPlanned || 0,
          staffActual: shift.staffActual || 0,
        });
      }
    }
  }, [editId, getShiftById]);

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

  const handleStructuredDowntimesChange = (downtimes: StructuredDowntime[]) => {
    setFormState(prev => ({ ...prev, structuredDowntimes: downtimes }));
  };

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setFormState(prev => ({ 
      ...prev, 
      monitoringPhoto: photo,
      photoFilename: filename,
    }));
  };

  const handleExcelImport = async (entries: ShiftFormData[]) => {
    let hasError = false;
    for (const entry of entries) {
      const result = await addShift(entry);
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

    if (!formState.date) {
      newErrors.date = 'Date is required';
    }
    if (!formState.productionLine.trim()) {
      newErrors.productionLine = 'Production Line is required';
    }
    if (!formState.lineLeader.trim()) {
      newErrors.lineLeader = 'Line Leader is required';
    }

    // Validate SKU rows - only SKU is required (no quantity in planner)
    if (formState.skuRows.length === 0) {
      newErrors.skuRows = 'At least one product is required';
    } else {
      formState.skuRows.forEach(row => {
        if (!row.sku.trim()) {
          newErrors[`sku_${row.id}`] = 'SKU is required';
        }
      });
    }

    // Validate structured downtimes - "Other" category requires comment
    const invalidDowntimes = formState.structuredDowntimes?.filter(
      d => d.category === 'other' && !d.comment?.trim()
    );
    if (invalidDowntimes && invalidDowntimes.length > 0) {
      newErrors.downtimes = 'Comment is required for "Other" category downtimes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Save new products to catalog if flagged
      for (const row of formState.skuRows) {
        if (row.isNewProduct && row.sku.trim() && row.product.trim()) {
          // Check if already exists
          const { data: existing } = await supabase
            .from('products')
            .select('product_code')
            .eq('product_code', row.sku)
            .maybeSingle();
          
          if (!existing) {
            const { error } = await supabase.from('products').insert({
              product_code: row.sku,
              product_description: row.product,
            });
            
            if (error) {
              console.error('Error saving new product:', error);
              toast.error(`Failed to save product ${row.sku} to catalog`);
            } else {
              toast.success(`Product ${row.sku} saved to catalog`);
            }
          }
        }
      }

      // If editing, update single shift
      if (editId && formState.skuRows.length === 1) {
        const row = formState.skuRows[0];
        const formData: ShiftFormData = {
          date: formState.date,
          shift: formState.shift,
          productionLine: formState.productionLine,
          lineLeader: formState.lineLeader,
          product: row.product,
          sku: row.sku,
          productionTarget: row.productionTarget,
          realProduction: row.realProduction,
          observations: formState.observations,
          downtimes: [],
          structuredDowntimes: formState.structuredDowntimes,
          monitoringPhoto: formState.monitoringPhoto,
          photoFilename: formState.photoFilename,
          staffPlanned: formState.staffPlanned,
          staffActual: formState.staffActual,
        };
        const result = await updateShift(editId, formData);
        if (!result.success) {
          toast.error(`Failed to update shift: ${result.error}`);
          return;
        }
      } else {
        // Save each SKU row as independent record
        let isFirstShift = true;
        for (const row of formState.skuRows) {
          if (!row.sku.trim()) continue;
          
          const formData: ShiftFormData = {
            date: formState.date,
            shift: formState.shift,
            productionLine: formState.productionLine,
            lineLeader: formState.lineLeader,
            product: row.product,
            sku: row.sku,
            productionTarget: row.productionTarget,
            realProduction: row.realProduction,
            observations: formState.observations,
            downtimes: [],
            structuredDowntimes: isFirstShift ? formState.structuredDowntimes : [],
            monitoringPhoto: formState.monitoringPhoto,
            photoFilename: formState.photoFilename,
            staffPlanned: formState.staffPlanned,
            staffActual: formState.staffActual,
          };
          
          const result = await addShift(formData);
          if (!result.success) {
            toast.error(`Failed to save shift: ${result.error}`);
            return;
          }
          isFirstShift = false;
        }
      }

      toast.success(editId ? 'Shift updated successfully!' : 'Shift saved successfully!');
      navigate('/history');
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormState(createInitialState());
    setErrors({});
  };

  return (
    <>
      <Header
        title={editId ? 'Edit Shift' : 'New Shift Report'}
        subtitle={isOperator ? 'Enter planned production data' : 'Record and review production data'}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Action Buttons */}
          {canReview && (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowProductUpload(true)}
                className="btn-secondary"
              >
                <Package size={18} />
                <span className="hidden sm:inline">Import Products</span>
              </button>
              <button
                onClick={() => setShowExcelUpload(true)}
                className="btn-secondary"
              >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">Import Plan</span>
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
                  <label htmlFor="date" className="label">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formState.date}
                    onChange={handleFieldChange}
                    className={`input-field ${errors.date ? 'border-destructive' : ''}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive mt-1">{errors.date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="shift" className="label">Shift</label>
                  <select
                    id="shift"
                    name="shift"
                    value={formState.shift}
                    onChange={handleFieldChange}
                    className="select-field"
                  >
                    {SHIFT_TYPES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="productionLine" className="label">
                    Production Line <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    id="productionLine"
                    name="productionLine"
                    value={formState.productionLine}
                    onChange={handleFieldChange}
                    placeholder="e.g., Line 1"
                    className={`input-field ${errors.productionLine ? 'border-destructive' : ''}`}
                    maxLength={50}
                  />
                  {errors.productionLine && (
                    <p className="text-sm text-destructive mt-1">{errors.productionLine}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lineLeader" className="label">
                    Line Leader <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    id="lineLeader"
                    name="lineLeader"
                    value={formState.lineLeader}
                    onChange={handleFieldChange}
                    placeholder="Leader name"
                    className={`input-field ${errors.lineLeader ? 'border-destructive' : ''}`}
                    maxLength={100}
                  />
                  {errors.lineLeader && (
                    <p className="text-sm text-destructive mt-1">{errors.lineLeader}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SKU Rows Section - Like Downtime Form */}
            <div className="card p-4 sm:p-6">
              <SkuRowForm
                skuRows={formState.skuRows}
                onChange={handleSkuRowsChange}
                canReview={canReview}
                errors={errors}
              />
              {errors.skuRows && (
                <p className="text-sm text-destructive mt-2">{errors.skuRows}</p>
              )}
            </div>

            {/* Staffing Section - Supervisor Only */}
            {canReview && (
              <div className="card p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                  <Users size={20} className="text-primary" />
                  Staffing
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="staffPlanned" className="label">Staff Planned</label>
                    <input
                      type="number"
                      id="staffPlanned"
                      name="staffPlanned"
                      value={formState.staffPlanned || ''}
                      onChange={handleFieldChange}
                      min="0"
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label htmlFor="staffActual" className="label">Staff Actual</label>
                    <input
                      type="number"
                      id="staffActual"
                      name="staffActual"
                      value={formState.staffActual || ''}
                      onChange={handleFieldChange}
                      min="0"
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Supervisor Review Section */}
            <div className={`card p-4 sm:p-6 border-l-4 ${canReview ? 'border-l-primary' : 'border-l-muted'}`}>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                <ClipboardCheck size={20} className={canReview ? 'text-primary' : 'text-muted-foreground'} />
                Production Review
                {!canReview && (
                  <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
                    <Lock size={14} />
                    Supervisor access required
                  </span>
                )}
              </h3>
              
              <div className={`${!canReview ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Observations */}
                <div className="mb-6">
                  <label htmlFor="observations" className="label">Comments / Observations</label>
                  <textarea
                    id="observations"
                    name="observations"
                    value={formState.observations}
                    onChange={handleFieldChange}
                    rows={3}
                    placeholder="Additional notes about the shift..."
                    className="input-field resize-none"
                    maxLength={500}
                    disabled={!canReview}
                  />
                </div>

                {/* Structured Downtime Section */}
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <StructuredDowntimeForm
                    downtimes={formState.structuredDowntimes || []}
                    onChange={handleStructuredDowntimesChange}
                    downtimeThreshold={60}
                  />
                  {errors.downtimes && (
                    <p className="text-sm text-destructive mt-2">{errors.downtimes}</p>
                  )}
                </div>

                {/* Photo Upload */}
                <div className="p-4 bg-muted rounded-lg">
                  <PhotoUpload
                    photo={formState.monitoringPhoto}
                    filename={formState.photoFilename}
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                <RotateCcw size={18} />
                Reset
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {editId ? 'Update Shift' : `Save ${formState.skuRows.length} Product(s)`}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <ExcelUpload
          onImport={handleExcelImport}
          onClose={() => setShowExcelUpload(false)}
        />
      )}

      {/* Product CSV Upload Modal */}
      {showProductUpload && (
        <ProductCsvUpload onClose={() => setShowProductUpload(false)} />
      )}
    </>
  );
}
