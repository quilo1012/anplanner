import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WeekNavigationProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function WeekNavigation({
  currentDate,
  onPreviousWeek,
  onNextWeek,
  onToday,
}: WeekNavigationProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onPreviousWeek}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextWeek}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={onToday} className="h-9 gap-2">
          <Calendar className="h-4 w-4" />
          Today
        </Button>
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
      </h2>
    </div>
  );
}
