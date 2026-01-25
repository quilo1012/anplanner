import { startOfWeek, addDays, isSameDay } from "date-fns";
import { Shift } from "@/types/shift";
import { DayColumn } from "./DayColumn";

interface WeekViewProps {
  currentDate: Date;
  shifts: Shift[];
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
}

export function WeekView({ currentDate, shifts, onAddShift, onEditShift }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), date));
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 divide-x">
        {weekDays.map((day) => (
          <DayColumn
            key={day.toISOString()}
            date={day}
            shifts={getShiftsForDay(day)}
            onAddShift={onAddShift}
            onEditShift={onEditShift}
          />
        ))}
      </div>
    </div>
  );
}
