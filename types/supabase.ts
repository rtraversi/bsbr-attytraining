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
    PostgrestVersion: "14.17"
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
      cert_generation_queue: {
        Row: {
          attempt_count: number
          created_at: string
          enrollment_id: string
          firm_id: string
          id: string
          last_error: string | null
          next_retry_at: string
          quiz_attempt_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          enrollment_id: string
          firm_id: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          quiz_attempt_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          enrollment_id?: string
          firm_id?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          quiz_attempt_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cert_generation_queue_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cert_generation_queue_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cert_generation_queue_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          enrollment_id: string
          expires_at: string
          firm_id: string
          firm_name: string | null
          holder_name: string | null
          id: string
          issued_at: string
          revoked_at: string | null
          revoked_reason: string | null
          storage_path: string
          user_id: string
          verification_token: string
        }
        Insert: {
          certificate_number: string
          enrollment_id: string
          expires_at: string
          firm_id: string
          firm_name?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          storage_path: string
          user_id: string
          verification_token?: string
        }
        Update: {
          certificate_number?: string
          enrollment_id?: string
          expires_at?: string
          firm_id?: string
          firm_name?: string | null
          holder_name?: string | null
          id?: string
          issued_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          storage_path?: string
          user_id?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cloudflare_stream_video_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          pass_threshold: number
          questions_per_attempt: number
          rise_embed_url: string | null
          title: string
        }
        Insert: {
          cloudflare_stream_video_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          pass_threshold?: number
          questions_per_attempt?: number
          rise_embed_url?: string | null
          title: string
        }
        Update: {
          cloudflare_stream_video_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          pass_threshold?: number
          questions_per_attempt?: number
          rise_embed_url?: string | null
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          firm_id: string
          id: string
          status: string
          total_training_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          firm_id: string
          id?: string
          status?: string
          total_training_seconds?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          firm_id?: string
          id?: string
          status?: string
          total_training_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          activated_at: string | null
          created_at: string
          email_verification_sent_at: string | null
          email_verification_token: string | null
          email_verified_at: string | null
          firm_id: string
          id: string
          invite_email_failed: boolean
          invited_at: string
          is_attorney: boolean
          occupies_seat: boolean
          role: string
          scorm_lesson_location: string | null
          scorm_suspend_data: string | null
          status: string
          terms_accepted_at: string | null
          terms_version: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          firm_id: string
          id?: string
          invite_email_failed?: boolean
          invited_at?: string
          is_attorney?: boolean
          occupies_seat?: boolean
          role?: string
          scorm_lesson_location?: string | null
          scorm_suspend_data?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          firm_id?: string
          id?: string
          invite_email_failed?: boolean
          invited_at?: string
          is_attorney?: boolean
          occupies_seat?: boolean
          role?: string
          scorm_lesson_location?: string | null
          scorm_suspend_data?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          max_seats: number
          name: string
          notify_cert_earned: boolean
          notify_weekly_summary: boolean
          onboarding_dismissed: boolean
          owner_id: string
          reminder_days: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          max_seats: number
          name: string
          notify_cert_earned?: boolean
          notify_weekly_summary?: boolean
          onboarding_dismissed?: boolean
          owner_id: string
          reminder_days?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          max_seats?: number
          name?: string
          notify_cert_earned?: boolean
          notify_weekly_summary?: boolean
          onboarding_dismissed?: boolean
          owner_id?: string
          reminder_days?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tier?: string
        }
        Relationships: []
      }
      intake_answers: {
        Row: {
          answered_at: string
          id: string
          question_key: string
          session_id: string
          value: Json
        }
        Insert: {
          answered_at?: string
          id?: string
          question_key: string
          session_id: string
          value: Json
        }
        Update: {
          answered_at?: string
          id?: string
          question_key?: string
          session_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "intake_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sensitive: {
        Row: {
          answered_at: string
          id: string
          question_key: string
          session_id: string
          value: Json
        }
        Insert: {
          answered_at?: string
          id?: string
          question_key: string
          session_id: string
          value: Json
        }
        Update: {
          answered_at?: string
          id?: string
          question_key?: string
          session_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "intake_sensitive_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sessions: {
        Row: {
          created_at: string
          current_question: string | null
          firm_id: string
          id: string
          policy_delivered_at: string | null
          purged_at: string | null
          started_by: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_question?: string | null
          firm_id: string
          id?: string
          policy_delivered_at?: string | null
          purged_at?: string | null
          started_by: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_question?: string | null
          firm_id?: string
          id?: string
          policy_delivered_at?: string | null
          purged_at?: string | null
          started_by?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_uploads: {
        Row: {
          bytes: number | null
          content_type: string | null
          id: string
          original_name: string | null
          session_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          bytes?: number | null
          content_type?: string | null
          id?: string
          original_name?: string | null
          session_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          bytes?: number | null
          content_type?: string | null
          id?: string
          original_name?: string | null
          session_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_uploads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      provisioning_failures: {
        Row: {
          created_at: string
          email: string
          reason: string
          resolved_at: string | null
          stripe_customer_id: string
          stripe_session_id: string
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason: string
          resolved_at?: string | null
          stripe_customer_id: string
          stripe_session_id: string
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string
          resolved_at?: string | null
          stripe_customer_id?: string
          stripe_session_id?: string
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          attempted_at: string
          enrollment_id: string
          firm_id: string
          id: string
          passed: boolean
          question_ids: string[] | null
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempted_at?: string
          enrollment_id: string
          firm_id: string
          id?: string
          passed: boolean
          question_ids?: string[] | null
          score: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempted_at?: string
          enrollment_id?: string
          firm_id?: string
          id?: string
          passed?: boolean
          question_ids?: string[] | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answers: Json
          correct_index: number
          course_id: string
          created_at: string
          explanation: string | null
          id: string
          is_active: boolean
          lesson: number | null
          question_text: string
          section_tag: string | null
        }
        Insert: {
          answers: Json
          correct_index: number
          course_id: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          lesson?: number | null
          question_text: string
          section_tag?: string | null
        }
        Update: {
          answers?: Json
          correct_index?: number
          course_id?: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          lesson?: number | null
          question_text?: string
          section_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          consumed_at: string | null
          course_id: string
          expires_at: string
          firm_id: string
          id: string
          issued_at: string
          question_ids: string[]
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          course_id: string
          expires_at: string
          firm_id: string
          id?: string
          issued_at?: string
          question_ids: string[]
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          course_id?: string
          expires_at?: string
          firm_id?: string
          id?: string
          issued_at?: string
          question_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          firm_id: string
          id: string
          max_seats: number
          updated_at: string
          used_seats: number
        }
        Insert: {
          firm_id: string
          id?: string
          max_seats: number
          updated_at?: string
          used_seats?: number
        }
        Update: {
          firm_id?: string
          id?: string
          max_seats?: number
          updated_at?: string
          used_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "seats_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      training_events: {
        Row: {
          event_timestamp: string
          event_type: string
          firm_id: string
          firm_member_id: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          event_timestamp?: string
          event_type: string
          firm_id: string
          firm_member_id: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          event_timestamp?: string
          event_type?: string
          firm_id?: string
          firm_member_id?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_events_firm_member_id_fkey"
            columns: ["firm_member_id"]
            isOneToOne: false
            referencedRelation: "firm_members"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_rate_limit: {
        Row: {
          attempts: number
          ip: string
          window_start: string
        }
        Insert: {
          attempts?: number
          ip: string
          window_start: string
        }
        Update: {
          attempts?: number
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_verification_rate_limit: {
        Args: { p_ip: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      find_user_id_by_email: { Args: { p_email: string }; Returns: string }
      firm_id: { Args: never; Returns: string }
      firm_role: { Args: never; Returns: string }
      generate_certificate_number: { Args: never; Returns: string }
      generate_verification_token: { Args: never; Returns: string }
      increment_training_seconds: {
        Args: { p_delta: number; p_enrollment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
