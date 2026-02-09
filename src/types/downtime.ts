export type DowntimeCategory = string;

export interface DowntimeReason {
  value: string;
  label: string;
}

export interface DowntimeCategoryItem {
  value: string;
  label: string;
}

// Fallback defaults (used if DB fetch fails)
export const DOWNTIME_CATEGORIES_FALLBACK: DowntimeCategoryItem[] = [
  { value: 'maintenance', label: 'Maintenance Issues' },
  { value: 'quality', label: 'Quality Issues' },
  { value: 'health_safety', label: 'Health & Safety' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'staff', label: 'Staff' },
  { value: 'other', label: 'Other' },
];

export const DOWNTIME_REASONS_FALLBACK: Record<string, DowntimeReason[]> = {
  maintenance: [
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'line_prep', label: 'Line Prep' },
    { value: 'blending', label: 'Blending' },
    { value: 'deep_clean', label: 'Deep Clean' },
    { value: 'blender_fault', label: 'Blender Fault' },
    { value: 'filler_fault', label: 'Filler Fault' },
    { value: 'labeller_fault', label: 'Labeller Fault' },
    { value: 'printer_fault', label: 'Printer Fault' },
    { value: 'conveyor_fault', label: 'Conveyor Fault' },
    { value: 'electrical_fault', label: 'Electrical Fault' },
    { value: 'sensor_fault', label: 'Sensor Fault' },
  ],
  quality: [
    { value: 'sample_approval', label: 'Sample Approval' },
    { value: 'line_approval', label: 'Line Approval' },
    { value: 'metal_detected', label: 'Metal Detected' },
    { value: 'leaks', label: 'Leaks' },
    { value: 'reblend', label: 'Reblend' },
  ],
  health_safety: [
    { value: 'incident', label: 'Safety Incident' },
    { value: 'inspection', label: 'Safety Inspection' },
    { value: 'ppe_issue', label: 'PPE Issue' },
    { value: 'evacuation', label: 'Evacuation' },
  ],
  warehouse: [
    { value: 'material_shortage', label: 'Material Shortage' },
    { value: 'wrong_material', label: 'Wrong Material' },
    { value: 'waiting_delivery', label: 'Waiting for Delivery' },
    { value: 'pallet_issue', label: 'Pallet Issue' },
  ],
  staff: [
    { value: 'new_staff', label: 'New Staff' },
    { value: 'training', label: 'Training' },
    { value: 'absent', label: 'Staff Absent' },
    { value: 'break_extended', label: 'Extended Break' },
    { value: 'shift_change', label: 'Shift Change Delay' },
  ],
  other: [
    { value: 'other', label: 'Other (specify in comment)' },
  ],
};

// Keep backward-compatible exports
export const DOWNTIME_CATEGORIES = DOWNTIME_CATEGORIES_FALLBACK;
export const DOWNTIME_REASONS_BY_CATEGORY = DOWNTIME_REASONS_FALLBACK;

export interface StructuredDowntime {
  id: string;
  category: DowntimeCategory;
  reason: string;
  duration: number; // in minutes
  comment?: string;
}
