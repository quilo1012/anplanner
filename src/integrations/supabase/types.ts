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
        ]
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
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
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
        ]
      }
      structured_downtimes: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          duration: number
          id: string
          reason: string
          session_id: string
        }
        Insert: {
          category: string
          comment?: string | null
          created_at?: string
          duration?: number
          id?: string
          reason: string
          session_id: string
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          duration?: number
          id?: string
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "structured_downtimes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "production_sessions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operator"
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
      app_role: ["admin", "supervisor", "operator"],
    },
  },
} as const
