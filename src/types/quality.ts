export interface QualityActionType {
  id: string;
  name: string;
  points: number;
  description: string | null;
  is_active: boolean;
}

export interface QualityActionRow {
  id?: string;          // db id when persisted
  tempId: string;       // client id for list management
  action_type_id: string;
  name: string;         // type name snapshot for display
  points: number;       // snapshot of type points
  notes: string;
}

export interface QualityActionDb {
  id: string;
  session_id: string | null;
  action_type_id: string;
  production_line: string | null;
  line_leader: string | null;
  date: string | null;
  shift_type: string | null;
  points: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}
