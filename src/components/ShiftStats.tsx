import { Shift } from "@/types/shift";
import { Users, Clock, Calendar, TrendingUp } from "lucide-react";

interface ShiftStatsProps {
  shifts: Shift[];
}

export function ShiftStats({ shifts }: ShiftStatsProps) {
  const uniqueEmployees = new Set(shifts.map((s) => s.employeeName)).size;
  const totalShifts = shifts.length;

  const shiftsByType = {
    morning: shifts.filter((s) => s.type === "morning").length,
    afternoon: shifts.filter((s) => s.type === "afternoon").length,
    night: shifts.filter((s) => s.type === "night").length,
  };

  const stats = [
    {
      label: "Total Shifts",
      value: totalShifts,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Employees",
      value: uniqueEmployees,
      icon: Users,
      color: "text-[hsl(var(--shift-custom))]",
      bg: "bg-[hsl(var(--shift-custom-bg))]",
    },
    {
      label: "Morning",
      value: shiftsByType.morning,
      icon: TrendingUp,
      color: "text-[hsl(var(--shift-morning))]",
      bg: "bg-[hsl(var(--shift-morning-bg))]",
    },
    {
      label: "Night",
      value: shiftsByType.night,
      icon: Clock,
      color: "text-[hsl(var(--shift-night))]",
      bg: "bg-[hsl(var(--shift-night-bg))]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
