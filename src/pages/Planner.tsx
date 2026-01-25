import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DowntimeForm } from '@/components/DowntimeForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftFormData, ShiftType, Downtime } from '@/types/shift';
import { Save, RotateCcw, X, User, ClipboardCheck, Lock } from 'lucide-react';

const initialFormData: ShiftFormData = {
  date: new Date().toISOString().split('T')[0],
  shift: 'Day',
  productionLine: '',
  lineLeader: '',
  product: '',
  sku: '',
  productionTarget: 0,
  realProduction: 0,
  observations: '',
  downtimes: [],
  monitoringPhoto: undefined,
  photoFilename: undefined,
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
          monitoringPhoto: shift.monitoringPhoto,
          photoFilename: shift.photoFilename,
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

  const handleDowntimesChange = (downtimes: Downtime[]) => {
    setFormData(prev => ({ ...prev, downtimes }));
  };

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setFormData(prev => ({ 
      ...prev, 
      monitoringPhoto: photo,
      photoFilename: filename,
    }));
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
    if (!formData.productionTarget || formData.productionTarget <= 0) {
      newErrors.productionTarget = 'Target must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (editId) {
        updateShift(editId, formData);
      } else {
        addShift(formData);
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

  return (
    <>
      <Header
        title={editId ? 'Edit Shift' : 'New Shift Report'}
        subtitle={isOperator ? 'Enter planned production data' : 'Record and review production data'}
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Operator Entry Section */}
          <div className="card p-6">
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2 text-lg">
              <User size={20} className="text-[hsl(var(--primary))]" />
              Operator Entry
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Basic shift information entered by the production operator
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="label">
                  Date <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`input-field ${errors.date ? 'border-[hsl(var(--destructive))]' : ''}`}
                />
                {errors.date && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.date}</p>
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
                  <option value="Day">☀️ Day Shift</option>
                  <option value="Night">🌙 Night Shift</option>
                </select>
              </div>

              <div>
                <label htmlFor="productionLine" className="label">
                  Production Line <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  id="productionLine"
                  name="productionLine"
                  value={formData.productionLine}
                  onChange={handleChange}
                  placeholder="e.g., Line 1, Line A"
                  className={`input-field ${errors.productionLine ? 'border-[hsl(var(--destructive))]' : ''}`}
                  maxLength={50}
                />
                {errors.productionLine && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.productionLine}</p>
                )}
              </div>

              <div>
                <label htmlFor="lineLeader" className="label">
                  Line Leader <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  id="lineLeader"
                  name="lineLeader"
                  value={formData.lineLeader}
                  onChange={handleChange}
                  placeholder="Leader name"
                  className={`input-field ${errors.lineLeader ? 'border-[hsl(var(--destructive))]' : ''}`}
                  maxLength={100}
                />
                {errors.lineLeader && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.lineLeader}</p>
                )}
              </div>

              <div>
                <label htmlFor="product" className="label">Product Name</label>
                <input
                  type="text"
                  id="product"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  placeholder="Product name"
                  className="input-field"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="sku" className="label">SKU</label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="SKU code"
                  className="input-field"
                  maxLength={50}
                />
              </div>

              <div>
                <label htmlFor="productionTarget" className="label">
                  Planned Quantity <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="number"
                  id="productionTarget"
                  name="productionTarget"
                  value={formData.productionTarget || ''}
                  onChange={handleChange}
                  min="1"
                  placeholder="0"
                  className={`input-field ${errors.productionTarget ? 'border-[hsl(var(--destructive))]' : ''}`}
                />
                {errors.productionTarget && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.productionTarget}</p>
                )}
              </div>
            </div>
          </div>

          {/* Supervisor Review Section */}
          <div className={`card p-6 border-l-4 ${canReview ? 'border-l-[hsl(var(--primary))]' : 'border-l-gray-300'}`}>
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2 text-lg">
              <ClipboardCheck size={20} className={canReview ? 'text-[hsl(var(--primary))]' : 'text-gray-400'} />
              Supervisor Review
              {!canReview && (
                <span className="ml-auto flex items-center gap-1 text-sm font-normal text-[hsl(var(--muted-foreground))]">
                  <Lock size={14} />
                  Supervisor access required
                </span>
              )}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Production results and observations reviewed by the supervisor
            </p>
            
            <div className={`${!canReview ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  <div className={`input-field font-bold text-lg ${
                    parseFloat(performance) >= 90 ? 'text-[hsl(var(--success))] bg-[hsl(145,65%,95%)]' :
                    parseFloat(performance) >= 75 ? 'text-[hsl(40,80%,35%)] bg-[hsl(40,95%,95%)]' :
                    'text-[hsl(var(--destructive))] bg-[hsl(0,85%,95%)]'
                  }`}>
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

              {/* Downtime Section */}
              <div className="mb-6 p-4 bg-[hsl(var(--muted))] rounded-lg">
                <DowntimeForm
                  downtimes={formData.downtimes}
                  onChange={handleDowntimesChange}
                />
              </div>

              {/* Photo Upload */}
              <div className="p-4 bg-[hsl(var(--muted))] rounded-lg">
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
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                <Save size={18} />
                {isSubmitting ? 'Saving...' : editId ? 'Update Shift' : (canReview ? 'Archive Shift' : 'Save Planned Shift')}
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
    </>
  );
}
