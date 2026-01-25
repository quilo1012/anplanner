import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shift, ShiftType } from "@/types/shift";

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onAddShift: (shift: Omit<Shift, "id">) => void;
  existingShift?: Shift | null;
  onDeleteShift?: (id: string) => void;
}

const shiftPresets: Record<ShiftType, { start: string; end: string; label: string }> = {
  morning: { start: "06:00", end: "14:00", label: "Morning (6AM - 2PM)" },
  afternoon: { start: "14:00", end: "22:00", label: "Afternoon (2PM - 10PM)" },
  night: { start: "22:00", end: "06:00", label: "Night (10PM - 6AM)" },
  custom: { start: "09:00", end: "17:00", label: "Custom" },
};

export function AddShiftDialog({
  open,
  onOpenChange,
  selectedDate,
  onAddShift,
  existingShift,
  onDeleteShift,
}: AddShiftDialogProps) {
  const [employeeName, setEmployeeName] = useState(existingShift?.employeeName || "");
  const [shiftType, setShiftType] = useState<ShiftType>(existingShift?.type || "morning");
  const [startTime, setStartTime] = useState(existingShift?.startTime || "06:00");
  const [endTime, setEndTime] = useState(existingShift?.endTime || "14:00");
  const [notes, setNotes] = useState(existingShift?.notes || "");

  const handleShiftTypeChange = (type: ShiftType) => {
    setShiftType(type);
    if (type !== "custom") {
      setStartTime(shiftPresets[type].start);
      setEndTime(shiftPresets[type].end);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !employeeName.trim()) return;

    onAddShift({
      employeeName: employeeName.trim(),
      date: selectedDate,
      startTime,
      endTime,
      type: shiftType,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setEmployeeName("");
    setShiftType("morning");
    setStartTime("06:00");
    setEndTime("14:00");
    setNotes("");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (existingShift && onDeleteShift) {
      onDeleteShift(existingShift.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingShift ? "Edit Shift" : "Add New Shift"}
          </DialogTitle>
          {selectedDate && (
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee Name</Label>
            <Input
              id="employee"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Enter employee name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shiftType">Shift Type</Label>
            <Select value={shiftType} onValueChange={(v) => handleShiftTypeChange(v as ShiftType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(shiftPresets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={shiftType !== "custom"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={shiftType !== "custom"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            {existingShift && onDeleteShift && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {existingShift ? "Save Changes" : "Add Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
