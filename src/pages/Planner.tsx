import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DowntimeForm } from '@/components/DowntimeForm';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftFormData, ShiftType, Downtime } from '@/types/shift';

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
};

export function Planner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { addShift, updateShift, getShiftById } = useShifts();
  const [formData, setFormData] = useState<ShiftFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }
    if (!formData.productionLine.trim()) {
      newErrors.productionLine = 'Linha de Produção é obrigatória';
    }
    if (!formData.lineLeader.trim()) {
      newErrors.lineLeader = 'Líder da Linha é obrigatório';
    }
    if (!formData.productionTarget || formData.productionTarget <= 0) {
      newErrors.productionTarget = 'Meta deve ser maior que 0';
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
        title={editId ? 'Editar Turno' : 'Novo Turno'}
        subtitle="Registre os dados de produção do turno"
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="card p-6 space-y-6">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="label">
                  Data <span className="text-[hsl(var(--destructive))]">*</span>
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
                <label htmlFor="shift" className="label">Turno</label>
                <select
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="Day">Day (Dia)</option>
                  <option value="Night">Night (Noite)</option>
                </select>
              </div>

              <div>
                <label htmlFor="productionLine" className="label">
                  Linha de Produção <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  id="productionLine"
                  name="productionLine"
                  value={formData.productionLine}
                  onChange={handleChange}
                  placeholder="Ex: Linha 1, Linha A"
                  className={`input-field ${errors.productionLine ? 'border-[hsl(var(--destructive))]' : ''}`}
                  maxLength={50}
                />
                {errors.productionLine && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.productionLine}</p>
                )}
              </div>

              <div>
                <label htmlFor="lineLeader" className="label">
                  Líder da Linha <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  id="lineLeader"
                  name="lineLeader"
                  value={formData.lineLeader}
                  onChange={handleChange}
                  placeholder="Nome do líder"
                  className={`input-field ${errors.lineLeader ? 'border-[hsl(var(--destructive))]' : ''}`}
                  maxLength={100}
                />
                {errors.lineLeader && (
                  <p className="text-sm text-[hsl(var(--destructive))] mt-1">{errors.lineLeader}</p>
                )}
              </div>

              <div>
                <label htmlFor="product" className="label">Produto</label>
                <input
                  type="text"
                  id="product"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  placeholder="Nome do produto"
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
                  placeholder="Código SKU"
                  className="input-field"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Production Section */}
            <div className="border-t border-[hsl(var(--border))] pt-6">
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Produção</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="productionTarget" className="label">
                    Meta de Produção <span className="text-[hsl(var(--destructive))]">*</span>
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

                <div>
                  <label htmlFor="realProduction" className="label">Produção Real</label>
                  <input
                    type="number"
                    id="realProduction"
                    name="realProduction"
                    value={formData.realProduction || ''}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Performance</label>
                  <div className={`input-field font-semibold ${
                    parseFloat(performance) >= 90 ? 'text-[hsl(var(--success))]' :
                    parseFloat(performance) >= 75 ? 'text-[hsl(40,80%,35%)]' :
                    'text-[hsl(var(--destructive))]'
                  }`}>
                    {performance}%
                  </div>
                </div>
              </div>
            </div>

            {/* Downtime Section */}
            <div className="border-t border-[hsl(var(--border))] pt-6">
              <DowntimeForm
                downtimes={formData.downtimes}
                onChange={handleDowntimesChange}
              />
            </div>

            {/* Observations */}
            <div className="border-t border-[hsl(var(--border))] pt-6">
              <label htmlFor="observations" className="label">Observações</label>
              <textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows={3}
                placeholder="Observações adicionais sobre o turno..."
                className="input-field resize-none"
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                {isSubmitting ? 'Salvando...' : editId ? 'Atualizar Turno' : 'Salvar Turno'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
              >
                Limpar
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
