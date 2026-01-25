import { useState } from "react";
import { addWeeks, subWeeks, startOfToday } from "date-fns";
import { WeekNavigation } from "@/components/WeekNavigation";
import { WeekView } from "@/components/WeekView";
import { AddShiftDialog } from "@/components/AddShiftDialog";
import { ShiftStats } from "@/components/ShiftStats";
import { Shift } from "@/types/shift";
import { CalendarDays } from "lucide-react";

// Sample data
const initialShifts: Shift[] = [
  {
    id: "1",
    employeeName: "Sarah Johnson",
    date: new Date(),
    startTime: "06:00",
    endTime: "14:00",
    type: "morning",
  },
  {
    id: "2",
    employeeName: "Mike Chen",
    date: new Date(),
    startTime: "14:00",
    endTime: "22:00",
    type: "afternoon",
  },
  {
    id: "3",
    employeeName: "Emma Wilson",
    date: new Date(Date.now() + 86400000),
    startTime: "22:00",
    endTime: "06:00",
    type: "night",
  },
  {
    id: "4",
    employeeName: "James Brown",
    date: new Date(Date.now() + 86400000 * 2),
    startTime: "06:00",
    endTime: "14:00",
    type: "morning",
  },
  {
    id: "5",
    employeeName: "Lisa Martinez",
    date: new Date(Date.now() + 86400000 * 2),
    startTime: "14:00",
    endTime: "22:00",
    type: "afternoon",
  },
];

const Index = () => {
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const handlePreviousWeek = () => setCurrentDate((d) => subWeeks(d, 1));
  const handleNextWeek = () => setCurrentDate((d) => addWeeks(d, 1));
  const handleToday = () => setCurrentDate(startOfToday());

  const handleAddShift = (date: Date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setDialogOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedDate(new Date(shift.date));
    setSelectedShift(shift);
    setDialogOpen(true);
  };

  const handleSaveShift = (shiftData: Omit<Shift, "id">) => {
    if (selectedShift) {
      // Edit existing shift
      setShifts((prev) =>
        prev.map((s) =>
          s.id === selectedShift.id ? { ...shiftData, id: s.id } : s
        )
      );
    } else {
      // Add new shift
      const newShift: Shift = {
        ...shiftData,
        id: Date.now().toString(),
      };
      setShifts((prev) => [...prev, newShift]);
    }
  };

  const handleDeleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Shift Planner</h1>
              <p className="text-sm text-muted-foreground">
                Manage your team's schedule efficiently
              </p>
            </div>
          </div>
          <WeekNavigation
            currentDate={currentDate}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onToday={handleToday}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <ShiftStats shifts={shifts} />
        <WeekView
          currentDate={currentDate}
          shifts={shifts}
          onAddShift={handleAddShift}
          onEditShift={handleEditShift}
        />
      </main>

      {/* Add/Edit Shift Dialog */}
      <AddShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onAddShift={handleSaveShift}
        existingShift={selectedShift}
        onDeleteShift={handleDeleteShift}
      />
    </div>
  );
};

export default Index;
