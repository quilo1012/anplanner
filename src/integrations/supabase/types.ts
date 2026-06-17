export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      checklist_responses: {
        Row: {
          checklist_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          work_order_id: string
        }
        Insert: {
          checklist_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          work_order_id: string
        }
        Update: {
          checklist_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          description: string
          id: string
          is_required: boolean
          problem_description_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_required?: boolean
          problem_description_id: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_required?: boolean
          problem_description_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_problem_description_id_fkey"
            columns: ["problem_description_id"]
            isOneToOne: false
            referencedRelation: "problem_descriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      device_lines: {
        Row: {
          created_at: string
          device_id: string
          id: string
          line_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          line_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_lines_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_lines_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_token: string
          id: string
          label: string | null
          last_seen_at: string | null
          line_id: string | null
          paired_at: string | null
          paired_by: string | null
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          line_id?: string | null
          paired_at?: string | null
          paired_by?: string | null
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          line_id?: string | null
          paired_at?: string | null
          paired_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      downtime_reasons: {
        Row: {
          category_name: string
          created_at: string
          id: string
          label: string
          name: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          label: string
          name: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          label?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "downtime_reasons_category_name_fkey"
            columns: ["category_name"]
            isOneToOne: false
            referencedRelation: "downtime_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      engineer_scores: {
        Row: {
          engineer_id: string
          id: string
          score: number
          updated_at: string
        }
        Insert: {
          engineer_id: string
          id?: string
          score?: number
          updated_at?: string
        }
        Update: {
          engineer_id?: string
          id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineer_scores_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          },
        ]
      }
      engineers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pin_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pin_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pin_hash?: string
        }
        Relationships: []
      }
      line_problem_descriptions: {
        Row: {
          created_at: string
          id: string
          line_id: string
          problem_description_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_id: string
          problem_description_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string
          problem_description_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_problem_descriptions_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_problem_descriptions_problem_description_id_fkey"
            columns: ["problem_description_id"]
            isOneToOne: false
            referencedRelation: "problem_descriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          created_at: string
          display_order: number
          has_sides: boolean
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          has_sides?: boolean
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          has_sides?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      machine_assignments: {
        Row: {
          assigned_from: string
          assigned_line: string
          assigned_until: string | null
          id: string
          machine_id: string
          moved_by: string | null
          notes: string | null
        }
        Insert: {
          assigned_from?: string
          assigned_line: string
          assigned_until?: string | null
          id?: string
          machine_id: string
          moved_by?: string | null
          notes?: string | null
        }
        Update: {
          assigned_from?: string
          assigned_line?: string
          assigned_until?: string | null
          id?: string
          machine_id?: string
          moved_by?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_assignments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_events: {
        Row: {
          action_taken: string | null
          created_at: string
          engineer_id: string | null
          engineer_name: string | null
          event_type: string
          id: string
          machine_id: string | null
          part_used: string | null
          problem_description: string | null
          work_order_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          engineer_id?: string | null
          engineer_name?: string | null
          event_type: string
          id?: string
          machine_id?: string | null
          part_used?: string | null
          problem_description?: string | null
          work_order_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          engineer_id?: string | null
          engineer_name?: string | null
          event_type?: string
          id?: string
          machine_id?: string | null
          part_used?: string | null
          problem_description?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_events_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "machine_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_location_log: {
        Row: {
          created_at: string
          from_location: string
          id: string
          machine_id: string
          moved_by: string | null
          to_location: string
        }
        Insert: {
          created_at?: string
          from_location: string
          id?: string
          machine_id: string
          moved_by?: string | null
          to_location: string
        }
        Update: {
          created_at?: string
          from_location?: string
          id?: string
          machine_id?: string
          moved_by?: string | null
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_location_log_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          category: Database["public"]["Enums"]["machine_category"] | null
          code: string | null
          created_at: string
          current_line: string | null
          current_location: string
          fixed_line: string | null
          health_score: number
          id: string
          last_maintenance_date: string | null
          line_id: string | null
          machine_type: string
          name: string
          sector: string | null
          side: string
          status: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["machine_category"] | null
          code?: string | null
          created_at?: string
          current_line?: string | null
          current_location?: string
          fixed_line?: string | null
          health_score?: number
          id?: string
          last_maintenance_date?: string | null
          line_id?: string | null
          machine_type: string
          name: string
          sector?: string | null
          side?: string
          status?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["machine_category"] | null
          code?: string | null
          created_at?: string
          current_line?: string | null
          current_location?: string
          fixed_line?: string | null
          health_score?: number
          id?: string
          last_maintenance_date?: string | null
          line_id?: string | null
          machine_type?: string
          name?: string
          sector?: string | null
          side?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_downtime: {
        Row: {
          category: string
          created_at: string
          ended_at: string | null
          id: string
          line: string
          machine: string | null
          notes: string | null
          reason: string
          reported_by: string | null
          started_at: string
          work_order_id: string
        }
        Insert: {
          category: string
          created_at?: string
          ended_at?: string | null
          id?: string
          line: string
          machine?: string | null
          notes?: string | null
          reason: string
          reported_by?: string | null
          started_at?: string
          work_order_id: string
        }
        Update: {
          category?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          line?: string
          machine?: string | null
          notes?: string | null
          reason?: string
          reported_by?: string | null
          started_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_downtime_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_downtime_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "maintenance_downtime_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_downtime_events: {
        Row: {
          created_at: string
          duration_minutes: number | null
          episode_number: number
          id: string
          is_recurrence: boolean
          resumed_at: string | null
          resumed_by: string | null
          resumed_by_name: string | null
          resumed_note: string | null
          stopped_at: string
          stopped_by: string | null
          stopped_by_name: string | null
          stopped_reason: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          episode_number?: number
          id?: string
          is_recurrence?: boolean
          resumed_at?: string | null
          resumed_by?: string | null
          resumed_by_name?: string | null
          resumed_note?: string | null
          stopped_at: string
          stopped_by?: string | null
          stopped_by_name?: string | null
          stopped_reason?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          episode_number?: number
          id?: string
          is_recurrence?: boolean
          resumed_at?: string | null
          resumed_by?: string | null
          resumed_by_name?: string | null
          resumed_note?: string | null
          stopped_at?: string
          stopped_by?: string | null
          stopped_by_name?: string | null
          stopped_reason?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_downtime_events_resumed_by_fkey"
            columns: ["resumed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_downtime_events_stopped_by_fkey"
            columns: ["stopped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_downtime_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "maintenance_downtime_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_assets: {
        Row: {
          active: boolean
          asset_number: number
          asset_type: Database["public"]["Enums"]["mobile_asset_type"]
          created_at: string
          current_line_id: string | null
          id: string
        }
        Insert: {
          active?: boolean
          asset_number: number
          asset_type: Database["public"]["Enums"]["mobile_asset_type"]
          created_at?: string
          current_line_id?: string | null
          id?: string
        }
        Update: {
          active?: boolean
          asset_number?: number
          asset_type?: Database["public"]["Enums"]["mobile_asset_type"]
          created_at?: string
          current_line_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_assets_current_line_id_fkey"
            columns: ["current_line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          priority: string
          read_at: string | null
          title: string
          user_id: string
          wo_id: string | null
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          priority?: string
          read_at?: string | null
          title: string
          user_id: string
          wo_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          priority?: string
          read_at?: string | null
          title?: string
          user_id?: string
          wo_id?: string | null
        }
        Relationships: []
      }
      operation_time: {
        Row: {
          created_at: string
          date: string
          downtime_minutes: number
          end_time: string | null
          id: string
          line: string
          notes: string | null
          session_id: string | null
          shift_type: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          downtime_minutes?: number
          end_time?: string | null
          id?: string
          line: string
          notes?: string | null
          session_id?: string | null
          shift_type: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          downtime_minutes?: number
          end_time?: string | null
          id?: string
          line?: string
          notes?: string | null
          session_id?: string | null
          shift_type?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_time_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "production_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_time_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_downtime_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      operator_line_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          label: string
          line_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          label: string
          line_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          label?: string
          line_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parts_used: {
        Row: {
          created_at: string
          engineer_id: string
          engineer_name: string
          id: string
          product_id: string
          quantity: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          engineer_id: string
          engineer_name: string
          id?: string
          product_id: string
          quantity: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          engineer_id?: string
          engineer_name?: string
          id?: string
          product_id?: string
          quantity?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_used_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_used_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "parts_used_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_descriptions: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          severity: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          severity?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          severity?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      production_items: {
        Row: {
          created_at: string
          id: string
          product_name: string | null
          quantity_actual: number | null
          quantity_target: number | null
          session_id: string
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_name?: string | null
          quantity_actual?: number | null
          quantity_target?: number | null
          session_id: string
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          product_name?: string | null
          quantity_actual?: number | null
          quantity_target?: number | null
          session_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "production_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_downtime_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      production_plans: {
        Row: {
          assembly_number: string | null
          avg_kg_per_worker: number | null
          batch_number: string | null
          blender_size: number | null
          comments: string | null
          created_at: string | null
          created_by: string | null
          ctp_comment: string | null
          ctp_percent: number | null
          date: string
          finish_time: string | null
          id: string
          line_revenue: number | null
          pcl_list: string | null
          product_code: string
          product_description: string | null
          production_hours: number | null
          qty: number
          revenue_per_hour: number | null
          shift_type: string
          start_time: string | null
          support_workers: number | null
          total_kg: number | null
          units_per_min: number | null
          units_per_min_expected: number | null
          updated_at: string | null
          weight_kg: number | null
          work_centre: string | null
          worked_hours: number | null
          workers_in_line: number | null
        }
        Insert: {
          assembly_number?: string | null
          avg_kg_per_worker?: number | null
          batch_number?: string | null
          blender_size?: number | null
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          ctp_comment?: string | null
          ctp_percent?: number | null
          date: string
          finish_time?: string | null
          id?: string
          line_revenue?: number | null
          pcl_list?: string | null
          product_code: string
          product_description?: string | null
          production_hours?: number | null
          qty?: number
          revenue_per_hour?: number | null
          shift_type: string
          start_time?: string | null
          support_workers?: number | null
          total_kg?: number | null
          units_per_min?: number | null
          units_per_min_expected?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          work_centre?: string | null
          worked_hours?: number | null
          workers_in_line?: number | null
        }
        Update: {
          assembly_number?: string | null
          avg_kg_per_worker?: number | null
          batch_number?: string | null
          blender_size?: number | null
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          ctp_comment?: string | null
          ctp_percent?: number | null
          date?: string
          finish_time?: string | null
          id?: string
          line_revenue?: number | null
          pcl_list?: string | null
          product_code?: string
          product_description?: string | null
          production_hours?: number | null
          qty?: number
          revenue_per_hour?: number | null
          shift_type?: string
          start_time?: string | null
          support_workers?: number | null
          total_kg?: number | null
          units_per_min?: number | null
          units_per_min_expected?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          work_centre?: string | null
          worked_hours?: number | null
          workers_in_line?: number | null
        }
        Relationships: []
      }
      production_sessions: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          is_archived: boolean
          is_unplanned: boolean
          line_leader: string
          planned_quantity: number | null
          production_line: string
          shift_type: string
          staff_actual: number | null
          staff_planned: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          is_archived?: boolean
          is_unplanned?: boolean
          line_leader: string
          planned_quantity?: number | null
          production_line: string
          shift_type: string
          staff_actual?: number | null
          staff_planned?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          is_archived?: boolean
          is_unplanned?: boolean
          line_leader?: string
          planned_quantity?: number | null
          production_line?: string
          shift_type?: string
          staff_actual?: number | null
          staff_planned?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      production_targets: {
        Row: {
          blender_capacity: number
          created_at: string | null
          expected_units_per_batch: number | null
          expected_units_per_hour: number
          id: string
          product_code: string
          product_description: string | null
          production_line: string
          updated_at: string | null
          weight_per_unit: number
        }
        Insert: {
          blender_capacity?: number
          created_at?: string | null
          expected_units_per_batch?: number | null
          expected_units_per_hour?: number
          id?: string
          product_code: string
          product_description?: string | null
          production_line: string
          updated_at?: string | null
          weight_per_unit?: number
        }
        Update: {
          blender_capacity?: number
          created_at?: string | null
          expected_units_per_batch?: number | null
          expected_units_per_hour?: number
          id?: string
          product_code?: string
          product_description?: string | null
          production_line?: string
          updated_at?: string | null
          weight_per_unit?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          product_code: string
          product_description: string
          updated_at: string
          weight_per_unit: number | null
        }
        Insert: {
          created_at?: string
          product_code: string
          product_description: string
          updated_at?: string
          weight_per_unit?: number | null
        }
        Update: {
          created_at?: string
          product_code?: string
          product_description?: string
          updated_at?: string
          weight_per_unit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          labor_rate: number
          last_seen_at: string | null
          name: string
          shift: string | null
          ui_preferences: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id: string
          labor_rate?: number
          last_seen_at?: string | null
          name: string
          shift?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          labor_rate?: number
          last_seen_at?: string | null
          name?: string
          shift?: string | null
          ui_preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quality_action_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points: number
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points?: number
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      quality_actions: {
        Row: {
          action_type_id: string
          created_at: string
          date: string | null
          id: string
          line_leader: string | null
          notes: string | null
          points: number
          production_line: string | null
          recorded_by: string | null
          session_id: string | null
          shift_type: string | null
          updated_at: string
        }
        Insert: {
          action_type_id: string
          created_at?: string
          date?: string | null
          id?: string
          line_leader?: string | null
          notes?: string | null
          points?: number
          production_line?: string | null
          recorded_by?: string | null
          session_id?: string | null
          shift_type?: string | null
          updated_at?: string
        }
        Update: {
          action_type_id?: string
          created_at?: string
          date?: string | null
          id?: string
          line_leader?: string | null
          notes?: string | null
          points?: number
          production_line?: string | null
          recorded_by?: string | null
          session_id?: string | null
          shift_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_actions_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "quality_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "production_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_downtime_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          line: string | null
          min_stock: number
          name: string
          price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          id?: string
          line?: string | null
          min_stock?: number
          name: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          line?: string | null
          min_stock?: number
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      structured_downtimes: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          duration: number
          ended_at: string | null
          id: string
          reason: string
          session_id: string
          source: string
          started_at: string | null
          work_order_id: string | null
        }
        Insert: {
          category: string
          comment?: string | null
          created_at?: string
          duration?: number
          ended_at?: string | null
          id?: string
          reason: string
          session_id: string
          source?: string
          started_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          duration?: number
          ended_at?: string | null
          id?: string
          reason?: string
          session_id?: string
          source?: string
          started_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "structured_downtimes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "production_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structured_downtimes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_downtime_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      system_settings: {
        Row: {
          admin_pin: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_pin: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_pin?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wo_episodes: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          episode_number: number
          finish_engineer_id: string | null
          finish_pin_verified: boolean
          finished_at: string | null
          id: string
          notes: string | null
          reopen_reason: string | null
          reopened_by: string | null
          started_at: string
          started_work_at: string | null
          work_order_id: string
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          episode_number?: number
          finish_engineer_id?: string | null
          finish_pin_verified?: boolean
          finished_at?: string | null
          id?: string
          notes?: string | null
          reopen_reason?: string | null
          reopened_by?: string | null
          started_at?: string
          started_work_at?: string | null
          work_order_id: string
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          episode_number?: number
          finish_engineer_id?: string | null
          finish_pin_verified?: boolean
          finished_at?: string | null
          id?: string
          notes?: string | null
          reopen_reason?: string | null
          reopened_by?: string | null
          started_at?: string
          started_work_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wo_episodes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wo_episodes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wo_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          user_id: string
          user_name: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          user_id: string
          user_name: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          user_id?: string
          user_name?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wo_messages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wo_messages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wo_pauses: {
        Row: {
          created_at: string
          id: string
          paused_at: string
          reason: string | null
          resumed_at: string | null
          wo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          paused_at?: string
          reason?: string | null
          resumed_at?: string | null
          wo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          paused_at?: string
          reason?: string | null
          resumed_at?: string | null
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wo_pauses_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wo_pauses_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wo_photos: {
        Row: {
          created_at: string
          id: string
          photo_type: string
          storage_path: string
          uploaded_by: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_type: string
          storage_path: string
          uploaded_by: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_type?: string
          storage_path?: string
          uploaded_by?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wo_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wo_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_logs: {
        Row: {
          action: string
          created_at: string
          engineer_id: string | null
          engineer_name: string | null
          id: string
          work_order_id: string
        }
        Insert: {
          action: string
          created_at?: string
          engineer_id?: string | null
          engineer_name?: string | null
          id?: string
          work_order_id: string
        }
        Update: {
          action?: string
          created_at?: string
          engineer_id?: string | null
          engineer_name?: string | null
          id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_downtime_summary"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          arrived_at: string | null
          checklist_completed: boolean
          closed_at: string | null
          closed_by: string | null
          completed_at: string | null
          created_at: string
          current_episode: number
          description: string
          engineer_id: string | null
          engineer_name: string | null
          engineer_notified_acknowledged_at: string | null
          finished_at: string | null
          id: string
          line_at_time: string | null
          line_id: string | null
          line_resumed_at: string | null
          line_resumed_by: string | null
          line_stopped: boolean
          line_stopped_at: string | null
          line_stopped_by: string | null
          locked_at: string | null
          locked_engineer_id: string | null
          machine: string | null
          mobile_asset_id: string | null
          notes: string | null
          notified_engineers: string[] | null
          operator_id: string
          operator_signature_name: string | null
          pause_reason: string
          paused_at: string | null
          physical_line_id: string | null
          priority: string
          received_at: string | null
          recurrence_of_wo_id: string | null
          reopen_count: number
          requester_name: string
          signed_by_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["wo_status"]
          total_paused_minutes: number
          wo_number: number
        }
        Insert: {
          arrived_at?: string | null
          checklist_completed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_episode?: number
          description: string
          engineer_id?: string | null
          engineer_name?: string | null
          engineer_notified_acknowledged_at?: string | null
          finished_at?: string | null
          id?: string
          line_at_time?: string | null
          line_id?: string | null
          line_resumed_at?: string | null
          line_resumed_by?: string | null
          line_stopped?: boolean
          line_stopped_at?: string | null
          line_stopped_by?: string | null
          locked_at?: string | null
          locked_engineer_id?: string | null
          machine?: string | null
          mobile_asset_id?: string | null
          notes?: string | null
          notified_engineers?: string[] | null
          operator_id: string
          operator_signature_name?: string | null
          pause_reason?: string
          paused_at?: string | null
          physical_line_id?: string | null
          priority?: string
          received_at?: string | null
          recurrence_of_wo_id?: string | null
          reopen_count?: number
          requester_name: string
          signed_by_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          total_paused_minutes?: number
          wo_number?: number
        }
        Update: {
          arrived_at?: string | null
          checklist_completed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_episode?: number
          description?: string
          engineer_id?: string | null
          engineer_name?: string | null
          engineer_notified_acknowledged_at?: string | null
          finished_at?: string | null
          id?: string
          line_at_time?: string | null
          line_id?: string | null
          line_resumed_at?: string | null
          line_resumed_by?: string | null
          line_stopped?: boolean
          line_stopped_at?: string | null
          line_stopped_by?: string | null
          locked_at?: string | null
          locked_engineer_id?: string | null
          machine?: string | null
          mobile_asset_id?: string | null
          notes?: string | null
          notified_engineers?: string[] | null
          operator_id?: string
          operator_signature_name?: string | null
          pause_reason?: string
          paused_at?: string | null
          physical_line_id?: string | null
          priority?: string
          received_at?: string | null
          recurrence_of_wo_id?: string | null
          reopen_count?: number
          requester_name?: string
          signed_by_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          total_paused_minutes?: number
          wo_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_mobile_asset_id_fkey"
            columns: ["mobile_asset_id"]
            isOneToOne: false
            referencedRelation: "mobile_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_session_downtime_summary: {
        Row: {
          categories: string[] | null
          events_count: number | null
          session_id: string | null
          total_minutes: number | null
        }
        Relationships: []
      }
      v_work_order_downtime_summary: {
        Row: {
          downtime_status: string | null
          events_count: number | null
          last_event_at: string | null
          total_minutes: number | null
          work_order_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_device_line_ids: { Args: never; Returns: string[] }
      current_device_token: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lines_for_device_token: {
        Args: { _token: string }
        Returns: {
          display_order: number
          id: string
          name: string
        }[]
      }
      list_active_profile_names: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_engineer_names: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_leader_names: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      set_engineer_pin: {
        Args: { _engineer_id: string; _new_pin: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      verify_pin_by_code: {
        Args: { _pin: string }
        Returns: {
          engineer_id: string
          engineer_name: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "supervisor"
        | "operator"
        | "engineer"
        | "manager"
        | "viewer"
      machine_category: "line_fixed" | "line_mobile" | "support"
      mobile_asset_type: "printer" | "bag_sealer"
      wo_status:
        | "open"
        | "in_progress"
        | "completed"
        | "force_closed"
        | "received"
        | "arrived"
        | "finished"
        | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "supervisor",
        "operator",
        "engineer",
        "manager",
        "viewer",
      ],
      machine_category: ["line_fixed", "line_mobile", "support"],
      mobile_asset_type: ["printer", "bag_sealer"],
      wo_status: [
        "open",
        "in_progress",
        "completed",
        "force_closed",
        "received",
        "arrived",
        "finished",
        "closed",
      ],
    },
  },
} as const
