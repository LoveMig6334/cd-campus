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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          tier: Database["public"]["Enums"]["admin_tier"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name: string
          email: string
          id?: string
          is_active?: boolean
          tier: Database["public"]["Enums"]["admin_tier"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          tier?: Database["public"]["Enums"]["admin_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          bar_variant: Database["public"]["Enums"]["booking_bar_variant"]
          created_at: string
          created_by_admin_id: string | null
          ends_at: string
          id: string
          klass: string | null
          purpose: string | null
          room_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id_4: string | null
          updated_at: string
          user_label: string
        }
        Insert: {
          bar_variant?: Database["public"]["Enums"]["booking_bar_variant"]
          created_at?: string
          created_by_admin_id?: string | null
          ends_at: string
          id?: string
          klass?: string | null
          purpose?: string | null
          room_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id_4?: string | null
          updated_at?: string
          user_label: string
        }
        Update: {
          bar_variant?: Database["public"]["Enums"]["booking_bar_variant"]
          created_at?: string
          created_by_admin_id?: string | null
          ends_at?: string
          id?: string
          klass?: string | null
          purpose?: string | null
          room_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id_4?: string | null
          updated_at?: string
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      carelin_replies: {
        Row: {
          avatar_letter: string | null
          body: string
          created_at: string
          created_by_admin_id: string | null
          id: string
          request_id: string
          role_label: string | null
          teacher_name: string | null
        }
        Insert: {
          avatar_letter?: string | null
          body: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          request_id: string
          role_label?: string | null
          teacher_name?: string | null
        }
        Update: {
          avatar_letter?: string | null
          body?: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          request_id?: string
          role_label?: string | null
          teacher_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carelin_replies_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carelin_replies_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "carelin_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      carelin_requests: {
        Row: {
          body: string
          created_at: string
          id: string
          klass: string | null
          status: Database["public"]["Enums"]["carelin_status"]
          student_id_4: string
          title: string
          who_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          klass?: string | null
          status?: Database["public"]["Enums"]["carelin_status"]
          student_id_4: string
          title: string
          who_name: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          klass?: string | null
          status?: Database["public"]["Enums"]["carelin_status"]
          student_id_4?: string
          title?: string
          who_name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          created_by_admin_id: string | null
          highlight: boolean
          id: string
          location: string | null
          starts_at: string
          tag: string | null
          title_en: string | null
          title_th: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by_admin_id?: string | null
          highlight?: boolean
          id?: string
          location?: string | null
          starts_at: string
          tag?: string | null
          title_en?: string | null
          title_th: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by_admin_id?: string | null
          highlight?: boolean
          id?: string
          location?: string | null
          starts_at?: string
          tag?: string | null
          title_en?: string | null
          title_th?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          color_token: string
          current_score: number
          id: number
          name_en: string
          name_th: string
          sort_order: number | null
          stat_summary: string | null
        }
        Insert: {
          color_token: string
          current_score?: number
          id: number
          name_en: string
          name_th: string
          sort_order?: number | null
          stat_summary?: string | null
        }
        Update: {
          color_token?: string
          current_score?: number
          id?: number
          name_en?: string
          name_th?: string
          sort_order?: number | null
          stat_summary?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          author_line: string | null
          created_at: string
          created_by_admin_id: string | null
          desc_long: string | null
          icon_key: string | null
          id: string
          is_featured: boolean
          klass: string | null
          status: Database["public"]["Enums"]["project_status"]
          submitted_at: string | null
          tags: Json | null
          thumb_bg: string | null
          title_en: string
          title_th: string | null
          updated_at: string
        }
        Insert: {
          author_line?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          desc_long?: string | null
          icon_key?: string | null
          id?: string
          is_featured?: boolean
          klass?: string | null
          status: Database["public"]["Enums"]["project_status"]
          submitted_at?: string | null
          tags?: Json | null
          thumb_bg?: string | null
          title_en: string
          title_th?: string | null
          updated_at?: string
        }
        Update: {
          author_line?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          desc_long?: string | null
          icon_key?: string | null
          id?: string
          is_featured?: boolean
          klass?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submitted_at?: string | null
          tags?: Json | null
          thumb_bg?: string | null
          title_en?: string
          title_th?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      pshare_posts: {
        Row: {
          art_bg: string | null
          art_halftone: string | null
          art_num_color: string | null
          author_alias: string | null
          body_md: string | null
          created_at: string
          created_by_admin_id: string | null
          id: string
          num_label: string | null
          published_at: string | null
          slug: string
          snippet: string | null
          status: Database["public"]["Enums"]["pshare_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          art_bg?: string | null
          art_halftone?: string | null
          art_num_color?: string | null
          author_alias?: string | null
          body_md?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          num_label?: string | null
          published_at?: string | null
          slug: string
          snippet?: string | null
          status?: Database["public"]["Enums"]["pshare_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          art_bg?: string | null
          art_halftone?: string | null
          art_num_color?: string | null
          author_alias?: string | null
          body_md?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          num_label?: string | null
          published_at?: string | null
          slug?: string
          snippet?: string | null
          status?: Database["public"]["Enums"]["pshare_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pshare_posts_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["room_kind"]
          name_en: string
          name_th: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["room_kind"]
          name_en: string
          name_th: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["room_kind"]
          name_en?: string
          name_th?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          key: string
          updated_at: string
          updated_by_admin_id: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by_admin_id?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by_admin_id?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_config_updated_by_admin_id_fkey"
            columns: ["updated_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_results: {
        Row: {
          category: Database["public"]["Enums"]["sport_result_category"]
          created_by_admin_id: string | null
          id: string
          placements: number[]
          recorded_at: string
          time_label: string | null
          title_en: string | null
          title_th: string
        }
        Insert: {
          category: Database["public"]["Enums"]["sport_result_category"]
          created_by_admin_id?: string | null
          id?: string
          placements: number[]
          recorded_at?: string
          time_label?: string | null
          title_en?: string | null
          title_th: string
        }
        Update: {
          category?: Database["public"]["Enums"]["sport_result_category"]
          created_by_admin_id?: string | null
          id?: string
          placements?: number[]
          recorded_at?: string
          time_label?: string | null
          title_en?: string | null
          title_th?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_results_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_admin_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_root_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_tier: "root" | "normal"
      booking_bar_variant: "default" | "y" | "p" | "g" | "o"
      booking_status: "Confirmed" | "Pending" | "Review"
      carelin_status: "open" | "answered"
      event_category: "sport" | "tradition" | "music" | "admin" | "academic"
      project_status: "Published" | "Under Review" | "Draft"
      pshare_status: "draft" | "published" | "review"
      room_kind: "music" | "meeting"
      sport_result_category: "Track" | "Team"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_tier: ["root", "normal"],
      booking_bar_variant: ["default", "y", "p", "g", "o"],
      booking_status: ["Confirmed", "Pending", "Review"],
      carelin_status: ["open", "answered"],
      event_category: ["sport", "tradition", "music", "admin", "academic"],
      project_status: ["Published", "Under Review", "Draft"],
      pshare_status: ["draft", "published", "review"],
      room_kind: ["music", "meeting"],
      sport_result_category: ["Track", "Team"],
    },
  },
} as const
