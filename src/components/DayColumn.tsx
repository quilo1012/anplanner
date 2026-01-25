import { format, isToday } from "date-fns";
import { Shift } from "@/types/shift";
import { ShiftCard } from "./ShiftCard";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface DayColumnProps {
  date: Date;
  shifts: Shift[];
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
}

export function DayColumn({ date, shifts, onAddShift, onEditShift }: DayColumnProps) {
  const today = isToday(date);

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Day Header */}
      <div
        className={cn(
          "text-center py-3 border-b",
          today && "bg-primary/5"
        )}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {format(date, "EEE")}
        </p>
        <p
          className={cn(
            "text-lg font-semibold mt-0.5",
            today
              ? "text-primary bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto"
              : "text-foreground"
          )}
        >
          {format(date, "d")}
        </p>
      </div>

      {/* Shifts Container */}
      <div className={cn(
        "flex-1 p-2 space-y-2 min-h-[300px]",
        today && "bg-primary/[0.02]"
      )}>
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            onClick={() => onEditShift(shift)}
          />
        ))}

        {/* Add Shift Button */}
        <button
          onClick={() => onAddShift(date)}
          className={cn(
            "w-full p-2 rounded-lg border-2 border-dashed border-border",
            "flex items-center justify-center gap-1.5",
            "text-muted-foreground text-sm",
            "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
            "transition-all duration-200"
          )}
        >
          <Plus className="w-4 h-4" />
          Add Shift
        </button>
      </div>
    </div>
  );
}
