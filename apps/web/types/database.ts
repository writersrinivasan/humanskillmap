export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type UserRole = 'candidate' | 'admin' | 'super_admin'
export type UploadStatus = 'pending' | 'uploaded' | 'processing' | 'processed' | 'failed'
export type AvailabilityStatus = 'open' | 'not_looking' | 'open_to_offers'
export type SkillType = 'technical' | 'soft' | 'domain' | 'tool' | 'language'
export type Proficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type DataSource = 'manual' | 'resume'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          role: UserRole
          is_active: boolean
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          email?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          last_login_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          headline: string | null
          summary: string | null
          avatar_url: string | null
          city: string | null
          state: string | null
          country: string | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          salary_exp_min: number | null
          salary_exp_max: number | null
          notice_period_days: number | null
          availability_status: AvailabilityStatus
          completion_pct: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          headline?: string | null
          summary?: string | null
          avatar_url?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          salary_exp_min?: number | null
          salary_exp_max?: number | null
          notice_period_days?: number | null
          availability_status?: AvailabilityStatus
          completion_pct?: number
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          headline?: string | null
          summary?: string | null
          avatar_url?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          salary_exp_min?: number | null
          salary_exp_max?: number | null
          notice_period_days?: number | null
          availability_status?: AvailabilityStatus
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      resume_uploads: {
        Row: {
          id: string
          user_id: string
          storage_path: string
          original_filename: string
          file_size_bytes: number | null
          mime_type: string | null
          status: UploadStatus
          processing_attempts: number
          error_message: string | null
          is_current: boolean
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          storage_path: string
          original_filename: string
          file_size_bytes?: number | null
          mime_type?: string | null
          status?: UploadStatus
          processing_attempts?: number
          error_message?: string | null
          is_current?: boolean
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          status?: UploadStatus
          processing_attempts?: number
          error_message?: string | null
          is_current?: boolean
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'resume_uploads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      skills: {
        Row: {
          id: string
          user_id: string
          upload_id: string | null
          skill_name: string
          skill_type: SkillType | null
          proficiency: Proficiency | null
          years_exp: number | null
          source: DataSource
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          upload_id?: string | null
          skill_name: string
          skill_type?: SkillType | null
          proficiency?: Proficiency | null
          years_exp?: number | null
          source?: DataSource
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          skill_name?: string
          skill_type?: SkillType | null
          proficiency?: Proficiency | null
          years_exp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'skills_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      experiences: {
        Row: {
          id: string
          user_id: string
          upload_id: string | null
          company_name: string
          role_title: string
          start_date: string | null
          end_date: string | null
          is_current: boolean
          description: string | null
          tech_stack: string[]
          city: string | null
          source: DataSource
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          upload_id?: string | null
          company_name: string
          role_title: string
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          description?: string | null
          tech_stack?: string[]
          city?: string | null
          source?: DataSource
          created_at?: string
        }
        Update: {
          company_name?: string
          role_title?: string
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          description?: string | null
          tech_stack?: string[]
          city?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'experiences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      educations: {
        Row: {
          id: string
          user_id: string
          upload_id: string | null
          institution: string
          degree: string | null
          field_of_study: string | null
          start_year: number | null
          end_year: number | null
          grade: string | null
          source: DataSource
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          upload_id?: string | null
          institution: string
          degree?: string | null
          field_of_study?: string | null
          start_year?: number | null
          end_year?: number | null
          grade?: string | null
          source?: DataSource
          created_at?: string
        }
        Update: {
          institution?: string
          degree?: string | null
          field_of_study?: string | null
          start_year?: number | null
          end_year?: number | null
          grade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'educations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      certifications: {
        Row: {
          id: string
          user_id: string
          cert_name: string
          issuer: string | null
          issued_date: string | null
          expiry_date: string | null
          credential_id: string | null
          credential_url: string | null
          source: DataSource
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cert_name: string
          issuer?: string | null
          issued_date?: string | null
          expiry_date?: string | null
          credential_id?: string | null
          credential_url?: string | null
          source?: DataSource
          created_at?: string
        }
        Update: {
          cert_name?: string
          issuer?: string | null
          issued_date?: string | null
          expiry_date?: string | null
          credential_id?: string | null
          credential_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'certifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      recompute_completion_pct: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ResumeUploadRow = Database['public']['Tables']['resume_uploads']['Row']
export type SkillRow = Database['public']['Tables']['skills']['Row']
export type ExperienceRow = Database['public']['Tables']['experiences']['Row']
export type EducationRow = Database['public']['Tables']['educations']['Row']
export type CertificationRow = Database['public']['Tables']['certifications']['Row']
