// Generated from the Supabase schema (generate_typescript_types), trimmed to
// the tables the app uses. Regenerate after schema changes.

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
  public: {
    Tables: {
      assessment_answers: {
        Row: {
          answered_at: string
          answered_by: string | null
          assessment_id: string
          option_id: string
          organization_id: string
          points_snapshot: number | null
          question_id: string
          template_id: string
          weight_snapshot: number | null
        }
        Insert: {
          answered_at?: string
          answered_by?: string | null
          assessment_id: string
          option_id: string
          organization_id?: string
          points_snapshot?: number | null
          question_id: string
          template_id?: string
          weight_snapshot?: number | null
        }
        Update: {
          answered_at?: string
          answered_by?: string | null
          assessment_id?: string
          option_id?: string
          organization_id?: string
          points_snapshot?: number | null
          question_id?: string
          template_id?: string
          weight_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_organization_id_template__fkey"
            columns: ["assessment_id", "organization_id", "template_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "organization_id", "template_id"]
          },
          {
            foreignKeyName: "assessment_answers_option_id_question_id_fkey"
            columns: ["option_id", "question_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id", "question_id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_organization_id_template_id_fkey"
            columns: ["question_id", "organization_id", "template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id", "organization_id", "template_id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          assessment_id: string
          computed_tier_id: string
          created_at: string
          final_tier_id: string | null
          max_possible: number
          organization_id: string
          overridden_by: string | null
          override_reason: string | null
          raw_score: number
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
        }
        Insert: {
          assessment_id: string
          computed_tier_id: string
          created_at?: string
          final_tier_id?: string | null
          max_possible: number
          organization_id: string
          overridden_by?: string | null
          override_reason?: string | null
          raw_score: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
        }
        Update: {
          assessment_id?: string
          computed_tier_id?: string
          created_at?: string
          final_tier_id?: string | null
          max_possible?: number
          organization_id?: string
          overridden_by?: string | null
          override_reason?: string | null
          raw_score?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_organization_id_fkey"
            columns: ["assessment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assessment_scores_computed_tier_id_organization_id_fkey"
            columns: ["computed_tier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risk_tiers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assessment_scores_final_tier_id_organization_id_fkey"
            columns: ["final_tier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risk_tiers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          created_by: string | null
          engagement_id: string
          expires_at: string | null
          filled_by_type: Database["public"]["Enums"]["filled_by_type"] | null
          id: string
          invite_token_hash: string | null
          organization_id: string
          parent_assessment_id: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          submitted_at: string | null
          submitted_by: string | null
          template_id: string
          type: Database["public"]["Enums"]["questionnaire_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          engagement_id: string
          expires_at?: string | null
          filled_by_type?: Database["public"]["Enums"]["filled_by_type"] | null
          id?: string
          invite_token_hash?: string | null
          organization_id: string
          parent_assessment_id?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          template_id: string
          type: Database["public"]["Enums"]["questionnaire_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          engagement_id?: string
          expires_at?: string | null
          filled_by_type?: Database["public"]["Enums"]["filled_by_type"] | null
          id?: string
          invite_token_hash?: string | null
          organization_id?: string
          parent_assessment_id?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string
          type?: Database["public"]["Enums"]["questionnaire_type"]
        }
        Relationships: [
          {
            foreignKeyName: "assessments_engagement_id_organization_id_fkey"
            columns: ["engagement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_engagements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assessments_parent_assessment_id_organization_id_engagemen_fkey"
            columns: ["parent_assessment_id", "organization_id", "engagement_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "organization_id", "engagement_id"]
          },
          {
            foreignKeyName: "assessments_template_id_organization_id_type_fkey"
            columns: ["template_id", "organization_id", "type"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id", "organization_id", "type"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_events: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: number
          new_role: Database["public"]["Enums"]["member_role"] | null
          old_role: Database["public"]["Enums"]["member_role"] | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_role?: Database["public"]["Enums"]["member_role"] | null
          old_role?: Database["public"]["Enums"]["member_role"] | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_role?: Database["public"]["Enums"]["member_role"] | null
          old_role?: Database["public"]["Enums"]["member_role"] | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["member_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          token_hash?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_sandbox: boolean
          is_template: boolean
          name: string
          reminder_sent_at: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sandbox?: boolean
          is_template?: boolean
          name: string
          reminder_sent_at?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sandbox?: boolean
          is_template?: boolean
          name?: string
          reminder_sent_at?: string | null
          slug?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          points: number
          position: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          organization_id: string
          points: number
          position?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          points?: number
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_organization_id_fkey"
            columns: ["question_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      questionnaire_questions: {
        Row: {
          category: Database["public"]["Enums"]["question_category"]
          created_at: string
          id: string
          organization_id: string
          position: number
          prompt: string
          template_id: string
          weight: number
        }
        Insert: {
          category: Database["public"]["Enums"]["question_category"]
          created_at?: string
          id?: string
          organization_id: string
          position?: number
          prompt: string
          template_id: string
          weight?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"]
          created_at?: string
          id?: string
          organization_id?: string
          position?: number
          prompt?: string
          template_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_template_id_organization_id_fkey"
            columns: ["template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["questionnaire_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["questionnaire_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["questionnaire_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_tiers: {
        Row: {
          created_at: string
          id: string
          min_score: number
          name: string
          organization_id: string
          rank: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_score: number
          name: string
          organization_id: string
          rank: number
        }
        Update: {
          created_at?: string
          id?: string
          min_score?: number
          name?: string
          organization_id?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tier_mappings: {
        Row: {
          created_at: string
          organization_id: string
          template_id: string
          template_type: Database["public"]["Enums"]["questionnaire_type"]
          tier_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          template_id: string
          template_type?: Database["public"]["Enums"]["questionnaire_type"]
          tier_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          template_id?: string
          template_type?: Database["public"]["Enums"]["questionnaire_type"]
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tier_mappings_template_id_organization_id_templat_fkey"
            columns: ["template_id", "organization_id", "template_type"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id", "organization_id", "type"]
          },
          {
            foreignKeyName: "template_tier_mappings_tier_id_organization_id_fkey"
            columns: ["tier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risk_tiers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      vendor_engagements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_engagements_vendor_id_organization_id_fkey"
            columns: ["vendor_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: { Args: { p_token: string }; Returns: string }
      create_followup_assessment: {
        Args: { p_template_id?: string; p_tiering_assessment_id: string }
        Returns: string
      }
      create_org_invite: {
        Args: {
          p_email?: string
          p_org: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_valid_for?: string
        }
        Returns: string
      }
      create_sandbox_workspace: {
        Args: { p_name: string; p_with_samples?: boolean }
        Returns: string
      }
      get_org_invite: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          organization_name: string
          role: Database["public"]["Enums"]["member_role"]
          status: string
        }[]
      }
      keepalive: { Args: never; Returns: number }
      load_sample_data: { Args: { p_org: string }; Returns: number }
      org_members: {
        Args: { p_org: string }
        Returns: {
          email: string
          is_you: boolean
          joined_at: string
          last_sign_in_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }[]
      }
      remove_member: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      revoke_org_invite: { Args: { p_invite_id: string }; Returns: undefined }
      sandbox_maintenance: { Args: { p_secret: string }; Returns: Json }
      sandbox_mark_reminded: {
        Args: { p_orgs: string[]; p_secret: string }
        Returns: number
      }
      set_member_role: {
        Args: {
          p_org: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_user: string
        }
        Returns: undefined
      }
      current_user_role: {
        Args: { org_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      get_assessment_for_token: { Args: { p_token: string }; Returns: Json }
      issue_assessment_invite: {
        Args: { p_assessment_id: string; p_valid_for?: string }
        Returns: string
      }
      review_assessment: {
        Args: {
          p_assessment_id: string
          p_final_tier_id: string
          p_override_reason?: string
        }
        Returns: undefined
      }
      save_assessment_answer: {
        Args: { p_option_id: string; p_question_id: string; p_token: string }
        Returns: undefined
      }
      submit_assessment: { Args: { p_token: string }; Returns: undefined }
      submit_assessment_internal: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      assessment_status: "draft" | "sent" | "in_progress" | "submitted" | "reviewed"
      filled_by_type: "vendor" | "internal"
      member_role: "admin" | "practitioner" | "learner"
      question_category:
        | "data_sensitivity"
        | "regulatory_exposure"
        | "cloud_infrastructure"
        | "fourth_party"
        | "breach_history"
        | "service_criticality"
        | "access_level"
        | "other"
      questionnaire_type: "tiering" | "followup"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
