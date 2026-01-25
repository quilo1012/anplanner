import { createContext, useContext, ReactNode } from 'react';
import { ShiftReport, ShiftFormData } from '@/types/shift';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ShiftContextType {
  shifts: ShiftReport[];
  addShift: (data: ShiftFormData) => void;
  updateShift: (id: string, data: ShiftFormData) => void;
  deleteShift: (id: string) => void;
  getShiftById: (id: string) => ShiftReport | undefined;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

function calculatePerformance(real: number, target: number): number {
  if (target <= 0) return 0;
  return (real / target) * 100;
}

function calculateTotalDowntime(downtimes: { duration: number }[]): number {
  return downtimes.reduce((total, d) => total + d.duration, 0);
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useLocalStorage<ShiftReport[]>('shift-reports', []);

  const addShift = (data: ShiftFormData) => {
    const now = new Date().toISOString();
    const newShift: ShiftReport = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      performance: calculatePerformance(data.realProduction, data.productionTarget),
      totalDowntime: calculateTotalDowntime(data.downtimes),
      createdAt: now,
      updatedAt: now,
    };
    setShifts(prev => [newShift, ...prev]);
  };

  const updateShift = (id: string, data: ShiftFormData) => {
    setShifts(prev =>
      prev.map(shift =>
        shift.id === id
          ? {
              ...shift,
              ...data,
              performance: calculatePerformance(data.realProduction, data.productionTarget),
              totalDowntime: calculateTotalDowntime(data.downtimes),
              updatedAt: new Date().toISOString(),
            }
          : shift
      )
    );
  };

  const deleteShift = (id: string) => {
    setShifts(prev => prev.filter(shift => shift.id !== id));
  };

  const getShiftById = (id: string) => {
    return shifts.find(shift => shift.id === id);
  };

  return (
    <ShiftContext.Provider value={{ shifts, addShift, updateShift, deleteShift, getShiftById }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShifts() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
}
