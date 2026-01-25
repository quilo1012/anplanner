export type ShiftType = 'morning' | 'afternoon' | 'night' | 'custom';

export interface Shift {
  id: string;
  employeeName: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: ShiftType;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  color: string;
}
