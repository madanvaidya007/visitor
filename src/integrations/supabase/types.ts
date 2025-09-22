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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string | null
          expires_at: string | null
          file_path: string
          file_size: number
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"]
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
          visit_request_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          expires_at?: string | null
          file_path: string
          file_size: number
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          visit_request_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          expires_at?: string | null
          file_path?: string
          file_size?: number
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          visit_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_visit_request_id_fkey"
            columns: ["visit_request_id"]
            isOneToOne: false
            referencedRelation: "visit_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          id_proof_url: string | null
          is_active: boolean | null
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          id_proof_url?: string | null
          is_active?: boolean | null
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          id_proof_url?: string | null
          is_active?: boolean | null
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visit_logs: {
        Row: {
          action: string
          id: string
          notes: string | null
          scanned_by: string | null
          timestamp: string | null
          visit_request_id: string
          zone_id: string | null
        }
        Insert: {
          action: string
          id?: string
          notes?: string | null
          scanned_by?: string | null
          timestamp?: string | null
          visit_request_id: string
          zone_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          notes?: string | null
          scanned_by?: string | null
          timestamp?: string | null
          visit_request_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_logs_visit_request_id_fkey"
            columns: ["visit_request_id"]
            isOneToOne: false
            referencedRelation: "visit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_requests: {
        Row: {
          created_at: string | null
          documents_uploaded: boolean | null
          end_time: string
          host_id: string
          id: string
          notes: string | null
          purpose: string
          qr_code: string | null
          rejection_reason: string | null
          start_time: string
          status: Database["public"]["Enums"]["visit_status"] | null
          updated_at: string | null
          visit_date: string
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          documents_uploaded?: boolean | null
          end_time: string
          host_id: string
          id?: string
          notes?: string | null
          purpose: string
          qr_code?: string | null
          rejection_reason?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          updated_at?: string | null
          visit_date: string
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          documents_uploaded?: boolean | null
          end_time?: string
          host_id?: string
          id?: string
          notes?: string | null
          purpose?: string
          qr_code?: string | null
          rejection_reason?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          updated_at?: string | null
          visit_date?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_access: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          visit_request_id: string
          zone_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          visit_request_id: string
          zone_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          visit_request_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_visit_request_id_fkey"
            columns: ["visit_request_id"]
            isOneToOne: false
            referencedRelation: "visit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_access_sessions: {
        Row: {
          entered_at: string | null
          escort_id: string | null
          exited_at: string | null
          id: string
          is_active: boolean | null
          session_metadata: Json | null
          visit_request_id: string
          visitor_id: string
          zone_access_id: string
          zone_id: string
        }
        Insert: {
          entered_at?: string | null
          escort_id?: string | null
          exited_at?: string | null
          id?: string
          is_active?: boolean | null
          session_metadata?: Json | null
          visit_request_id: string
          visitor_id: string
          zone_access_id: string
          zone_id: string
        }
        Update: {
          entered_at?: string | null
          escort_id?: string | null
          exited_at?: string | null
          id?: string
          is_active?: boolean | null
          session_metadata?: Json | null
          visit_request_id?: string
          visitor_id?: string
          zone_access_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_access_sessions_escort_id_fkey"
            columns: ["escort_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_sessions_visit_request_id_fkey"
            columns: ["visit_request_id"]
            isOneToOne: false
            referencedRelation: "visit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_sessions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_sessions_zone_access_id_fkey"
            columns: ["zone_access_id"]
            isOneToOne: false
            referencedRelation: "zone_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_access_sessions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["zone_alert_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: number
          title: string
          zone_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["zone_alert_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          title: string
          zone_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["zone_alert_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          title?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_alerts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_entry_logs: {
        Row: {
          action: Database["public"]["Enums"]["zone_action"]
          device_id: string | null
          id: string
          location_details: Json | null
          notes: string | null
          scanned_by: string | null
          timestamp: string | null
          visit_request_id: string | null
          visitor_id: string
          zone_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["zone_action"]
          device_id?: string | null
          id?: string
          location_details?: Json | null
          notes?: string | null
          scanned_by?: string | null
          timestamp?: string | null
          visit_request_id?: string | null
          visitor_id: string
          zone_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["zone_action"]
          device_id?: string | null
          id?: string
          location_details?: Json | null
          notes?: string | null
          scanned_by?: string | null
          timestamp?: string | null
          visit_request_id?: string | null
          visitor_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_entry_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_entry_logs_visit_request_id_fkey"
            columns: ["visit_request_id"]
            isOneToOne: false
            referencedRelation: "visit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_entry_logs_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_entry_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_occupancy: {
        Row: {
          current_count: number
          id: string
          last_updated: string | null
          max_capacity: number | null
          updated_by: string | null
          zone_id: string
        }
        Insert: {
          current_count?: number
          id?: string
          last_updated?: string | null
          max_capacity?: number | null
          updated_by?: string | null
          zone_id: string
        }
        Update: {
          current_count?: number
          id?: string
          last_updated?: string | null
          max_capacity?: number | null
          updated_by?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_occupancy_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_occupancy_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: true
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_capacity: number | null
          name: string
          requires_escort: boolean | null
          updated_at: string | null
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          name: string
          requires_escort?: boolean | null
          updated_at?: string | null
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          name?: string
          requires_escort?: boolean | null
          updated_at?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_qr_code: {
        Args: { visit_request_id: string }
        Returns: string
      }
      get_zone_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_alerts: number
          active_zones: number
          current_visitors: number
          restricted_zones: number
          total_zones: number
          zones_at_capacity: number
        }[]
      }
      log_zone_access: {
        Args: {
          p_action: Database["public"]["Enums"]["zone_action"]
          p_device_id?: string
          p_notes?: string
          p_scanned_by?: string
          p_visit_request_id: string
          p_visitor_id: string
          p_zone_id: string
        }
        Returns: string
      }
      resolve_zone_alert: {
        Args: { p_alert_id: string; p_resolved_by: string }
        Returns: undefined
      }
      update_zone_occupancy: {
        Args: {
          p_action: Database["public"]["Enums"]["zone_action"]
          p_updated_by?: string
          p_visitor_id?: string
          p_zone_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      document_category: "required" | "optional" | "archived"
      document_status: "pending" | "approved" | "rejected" | "expired"
      document_type: "id_proof" | "photo" | "nda" | "insurance" | "other"
      user_role: "visitor" | "host" | "reception" | "admin" | "security"
      visit_status:
        | "pending"
        | "approved"
        | "rejected"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      zone_action: "entry" | "exit" | "emergency_exit" | "forced_entry"
      zone_alert_type:
        | "capacity_exceeded"
        | "unauthorized_access"
        | "emergency"
        | "maintenance"
      zone_type:
        | "lobby"
        | "office"
        | "meeting_room"
        | "lab"
        | "server_room"
        | "parking"
        | "restricted"
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
      document_category: ["required", "optional", "archived"],
      document_status: ["pending", "approved", "rejected", "expired"],
      document_type: ["id_proof", "photo", "nda", "insurance", "other"],
      user_role: ["visitor", "host", "reception", "admin", "security"],
      visit_status: [
        "pending",
        "approved",
        "rejected",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      zone_action: ["entry", "exit", "emergency_exit", "forced_entry"],
      zone_alert_type: [
        "capacity_exceeded",
        "unauthorized_access",
        "emergency",
        "maintenance",
      ],
      zone_type: [
        "lobby",
        "office",
        "meeting_room",
        "lab",
        "server_room",
        "parking",
        "restricted",
      ],
    },
  },
} as const
