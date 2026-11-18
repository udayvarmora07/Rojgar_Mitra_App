// Auto-generated Supabase database types
// These types are based on the schema in supabase_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          department: string
          post_date: string
          deadline: string
          salary: string | null
          source_link: string | null
          vacancies: number | null
          qualification: string | null
          advertisement_no: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          department: string
          post_date: string
          deadline: string
          salary?: string | null
          source_link?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          department?: string
          post_date?: string
          deadline?: string
          salary?: string | null
          source_link?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_details: {
        Row: {
          id: string
          job_id: string
          age_limit: string
          required_qualifications: string
          application_fees: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          age_limit: string
          required_qualifications: string
          application_fees?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          age_limit?: string
          required_qualifications?: string
          application_fees?: string | null
          created_at?: string
        }
        Relationships: {
          foreignKeyName: "job_details_job_id_fkey"
          columns: ["job_id"]
          isMany: false
          isUnique: false
          referencedRelation: "jobs"
          referencedColumns: ["id"]
        }[]
      }
      documents_required: {
        Row: {
          id: string
          job_id: string
          document_name: string
          phase: "Application" | "Exam Center"
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          document_name: string
          phase: "Application" | "Exam Center"
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          document_name?: string
          phase?: "Application" | "Exam Center"
          created_at?: string
        }
        Relationships: {
          foreignKeyName: "documents_required_job_id_fkey"
          columns: ["job_id"]
          isMany: false
          isUnique: false
          referencedRelation: "jobs"
          referencedColumns: ["id"]
        }[]
      }
      learning_resources: {
        Row: {
          id: string
          job_id: string
          resource_type: "PDF" | "AI_Test" | "Video" | "Link"
          link_or_content: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          resource_type: "PDF" | "AI_Test" | "Video" | "Link"
          link_or_content: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          resource_type?: "PDF" | "AI_Test" | "Video" | "Link"
          link_or_content?: string
          created_at?: string
        }
        Relationships: {
          foreignKeyName: "learning_resources_job_id_fkey"
          columns: ["job_id"]
          isMany: false
          isUnique: false
          referencedRelation: "jobs"
          referencedColumns: ["id"]
        }[]
      }
    }
    Views: {
      [_ in string]: never
    }
    Functions: {
      get_practice_questions: {
        Args: { p_topic: string; p_language: string; p_count?: number }
        Returns: {
          id: string
          topic: string
          language: string
          subtopic: string | null
          question: string
          options: Json
          correct: string
          explanation: string
          model: string | null
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in string]: never
    }
    CompositeTypes: {
      [_ in string]: never
    }
  }
}

// Table type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']