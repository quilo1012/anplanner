import { Shift } from "@/types/shift";
import { cn } from "@/lib/utils";
import { Clock, User } from "lucide-react";

interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
}

const shiftTypeStyles: Record<string, string> = {
  morning: "shift-morning",
  afternoon: "shift-afternoon", 
  night: "shift-night",
  custom: "shift-custom",
};

export function ShiftCard({ shift, onClick }: ShiftCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-lg border cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        shiftTypeStyles[shift.type]
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-3.5 h-3.5" />
        <span className="font-medium text-sm truncate">{shift.employeeName}</span>
      </div>
      <div className="flex items-center gap-1.5 opacity-80">
        <Clock className="w-3 h-3" />
        <span className="text-xs">
          {shift.startTime} - {shift.endTime}
        </span>
      </div>
    </div>
  );
}
