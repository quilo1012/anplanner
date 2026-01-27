export type DowntimeCategory = 'machine' | 'material' | 'people' | 'process' | 'other';

export interface DowntimeReason {
  value: string;
  label: string;
}

export const DOWNTIME_CATEGORIES: { value: DowntimeCategory; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'material', label: 'Material' },
  { value: 'people', label: 'People' },
  { value: 'process', label: 'Process' },
  { value: 'other', label: 'Other' },
];

export const DOWNTIME_REASONS_BY_CATEGORY: Record<DowntimeCategory, DowntimeReason[]> = {
  machine: [
    { value: 'breakdown', label: 'Machine Breakdown' },
    { value: 'maintenance', label: 'Scheduled Maintenance' },
    { value: 'calibration', label: 'Calibration Required' },
    { value: 'power_failure', label: 'Power Failure' },
    { value: 'sensor_issue', label: 'Sensor Issue' },
  ],
  material: [
    { value: 'shortage', label: 'Material Shortage' },
    { value: 'quality_issue', label: 'Material Quality Issue' },
    { value: 'wrong_material', label: 'Wrong Material Delivered' },
    { value: 'waiting_delivery', label: 'Waiting for Delivery' },
  ],
  people: [
    { value: 'absent', label: 'Operator Absent' },
    { value: 'training', label: 'Training' },
    { value: 'break', label: 'Extended Break' },
    { value: 'shift_change', label: 'Shift Change Delay' },
  ],
  process: [
    { value: 'setup', label: 'Setup / Changeover' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'quality_check', label: 'Quality Check Hold' },
    { value: 'approval_wait', label: 'Waiting for Approval' },
    { value: 'battery_waiting', label: 'Battery Waiting' },
  ],
  other: [
    { value: 'other', label: 'Other (specify in comment)' },
  ],
};

export interface StructuredDowntime {
  id: string;
  category: DowntimeCategory;
  reason: string;
  duration: number; // in minutes
  comment?: string;
}
