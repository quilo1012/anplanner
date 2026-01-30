import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ProductSearch } from '@/components/ProductSearch';
import { ProductCsvUpload } from '@/components/ProductCsvUpload';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftFormData, ShiftType, StructuredDowntime, SHIFT_TYPES } from '@/types/shift';
import { Save, RotateCcw, X, User, ClipboardCheck, Lock, FileSpreadsheet, Package, Users } from 'lucide-react';

const initialFormData: ShiftFormData = {
  date: new Date().toISOString().split('T')[0],
  shift: 'A',
  productionLine: '',
  lineLeader: '',
  product: '',
  sku: '',
  productionTarget: 0,
  realProduction: 0,
  observations: '',
  downtimes: [],
  structuredDowntimes: [],
  monitoringPhoto: undefined,
  photoFilename: undefined,
  staffPlanned: 0,
  staffActual: 0,
};

export function Planner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { addShift, updateShift, getShiftById } = useShifts();
  const { user, hasRole } = useAuth();
  const [formData, setFormData] = useState<ShiftFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showProductUpload, setShowProductUpload] = useState(false);

  const isOperator = user?.role === 'operator';
  const canReview = hasRole(['supervisor', 'admin']);

  useEffect(() => {
    if (editId) {
      const shift = getShiftById(editId);
      if (shift) {
        setFormData({
          date: shift.date,
          shift: shift.shift,
          productionLine: shift.productionLine,
          lineLeader: shift.lineLeader,
          product: shift.product,
          sku: shift.sku,
          productionTarget: shift.productionTarget,
          realProduction: shift.realProduction,
          observations: shift.observations,
          downtimes: shift.downtimes,
          structuredDowntimes: shift.structuredDowntimes || [],
          monitoringPhoto: shift.monitoringPhoto,
          photoFilename: shift.photoFilename,
          staffPlanned: shift.staffPlanned || 0,
          staffActual: shift.staffActual || 0,
        });
      }
    }
  }, [editId, getShiftById]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStructuredDowntimesChange = (downtimes: StructuredDowntime[]) => {
    setFormData(prev => ({ ...prev, structuredDowntimes: downtimes }));
  };

  const handleProductSelect = (sku: string, product?: { sku: string; name: string }) => {
    setFormData(prev => ({
      ...prev,
      sku,
      product: product?.name || prev.product,
    }));
  };

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setFormData(prev => ({ 
      ...prev, 
      monitoringPhoto: photo,
      photoFilename: filename,
    }));
  };

  const handleExcelImport = async (entries: ShiftFormData[]) => {
    for (const entry of entries) {
      await addShift(entry);
    }
    setShowExcelUpload(false);
    navigate('/history');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.productionLine.trim()) {
      newErrors.productionLine = 'Production Line is required';
    }
    if (!formData.lineLeader.trim()) {
      newErrors.lineLeader = 'Line Leader is required';
    }
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    if (!formData.productionTarget || formData.productionTarget <= 0) {
      newErrors.productionTarget = 'Target must be greater than 0';
    }

    // Validate structured downtimes - "Other" category requires comment
    const invalidDowntimes = formData.structuredDowntimes?.filter(
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
      if (editId) {
        await updateShift(editId, formData);
      } else {
        await addShift(formData);
      }
      navigate('/history');
    } catch (error) {
      console.error('Error saving shift:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  const performance = formData.productionTarget > 0
    ? ((formData.realProduction / formData.productionTarget) * 100).toFixed(1)
    : '0.0';

  const getPerformanceClass = (perf: number) => {
    if (perf >= 90) return 'text-success bg-success/10';
    if (perf >= 75) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
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
            {/* Operator Entry Section */}
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                <User size={20} className="text-primary" />
                Shift Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="date" className="label">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
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
                    value={formData.shift}
                    onChange={handleChange}
                    className="select-field"
                  >
                    {SHIFT_TYPES.map(s => (
                      <option key={s} value={s}>Shift {s}</option>
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
                    value={formData.productionLine}
                    onChange={handleChange}
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
                    value={formData.lineLeader}
                    onChange={handleChange}
                    placeholder="Leader name"
                    className={`input-field ${errors.lineLeader ? 'border-destructive' : ''}`}
                    maxLength={100}
                  />
                  {errors.lineLeader && (
                    <p className="text-sm text-destructive mt-1">{errors.lineLeader}</p>
                  )}
                </div>

                {/* SKU Field - Now first in product section */}
                <div>
                  <label htmlFor="sku" className="label flex items-center gap-2">
                    <Package size={14} />
                    SKU <span className="text-destructive">*</span>
                  </label>
                  {canReview ? (
                    <ProductSearch
                      value={formData.sku}
                      onChange={handleProductSelect}
                      placeholder="Type SKU to search..."
                    />
                  ) : (
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="SKU code"
                      className={`input-field ${errors.sku ? 'border-destructive' : ''}`}
                      maxLength={50}
                    />
                  )}
                  {errors.sku && (
                    <p className="text-sm text-destructive mt-1">{errors.sku}</p>
                  )}
                </div>

                {/* Product Name - Auto-filled */}
                <div>
                  <label htmlFor="product" className="label">
                    Product Name
                    <span className="text-xs text-muted-foreground ml-1">(auto-filled)</span>
                  </label>
                  <input
                    type="text"
                    id="product"
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    placeholder="Auto-filled from SKU"
                    className="input-field"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label htmlFor="productionTarget" className="label">
                    Planned Quantity <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    id="productionTarget"
                    name="productionTarget"
                    value={formData.productionTarget || ''}
                    onChange={handleChange}
                    min="1"
                    placeholder="0"
                    className={`input-field ${errors.productionTarget ? 'border-destructive' : ''}`}
                  />
                  {errors.productionTarget && (
                    <p className="text-sm text-destructive mt-1">{errors.productionTarget}</p>
                  )}
                </div>
              </div>
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
                      value={formData.staffPlanned || ''}
                      onChange={handleChange}
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
                      value={formData.staffActual || ''}
                      onChange={handleChange}
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
                Production Results
                {!canReview && (
                  <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
                    <Lock size={14} />
                    Supervisor access required
                  </span>
                )}
              </h3>
              
              <div className={`${!canReview ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label htmlFor="realProduction" className="label">Actual Production</label>
                    <input
                      type="number"
                      id="realProduction"
                      name="realProduction"
                      value={formData.realProduction || ''}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
                      className="input-field"
                      disabled={!canReview}
                    />
                  </div>

                  <div>
                    <label className="label">Performance</label>
                    <div className={`input-field font-bold text-lg ${getPerformanceClass(parseFloat(performance))}`}>
                      {performance}%
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="mb-6">
                  <label htmlFor="observations" className="label">Comments / Observations</label>
                  <textarea
                    id="observations"
                    name="observations"
                    value={formData.observations}
                    onChange={handleChange}
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
                    downtimes={formData.structuredDowntimes || []}
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
                    photo={formData.monitoringPhoto}
                    filename={formData.photoFilename}
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 min-w-[150px]"
                >
                  <Save size={18} />
                  {isSubmitting ? 'Saving...' : editId ? 'Update Shift' : 'Save Shift'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => navigate('/history')}
                    className="btn-secondary"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                )}
              </div>
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
        <ProductCsvUpload
          onClose={() => setShowProductUpload(false)}
          onSuccess={() => setShowProductUpload(false)}
        />
      )}
    </>
  );
}
