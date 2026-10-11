type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  role: "job_seeker" | "admin" | "training_provider";
  sector: "government" | "private" | null;
  display_name: string | null;
  location: string | null;
  designation: string | null;
  phone: string | null;
  specialization: string | null;
  terms_accepted_at: string | null;
  account_status: "active" | "suspended";
  education: string | null;
  qualifications: string[];
  skills: string[];
  experience_years: number | null;
  preferred_roles: string[];
  preferred_locations: string[];
  job_alerts_enabled: boolean;
  resume_path: string | null;
  created_at: string;
  updated_at: string;
};

type JobRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employment_type: string;
  required_skills: string[];
  preferred_skills: string[];
  required_qualifications: string[];
  min_experience_years: number;
  application_deadline: string | null;
  application_instructions: string;
  mandatory_education: string | null;
  location_restrictions: string[];
  owner_admin_id: string | null;
  status: "draft" | "published" | "closed";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type CourseRow = {
  id: string;
  organization_id: string;
  owner_provider_id: string | null;
  title: string;
  description: string;
  skills_taught: string[];
  specialization: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  delivery_mode: "online" | "in_person" | "hybrid";
  duration: string | null;
  course_url: string;
  image_path: string | null;
  status: "draft" | "published" | "closed";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  submitted_at: string;
  status:
    | "submitted"
    | "under_review"
    | "shortlisted"
    | "rejected"
    | "selected"
    | "withdrawn";
  status_changed_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        ProfileRow,
        Partial<ProfileRow> & { id: string },
        Partial<ProfileRow>
      >;
      organizations: {
        Row: {
          id: string;
          name: string;
          sector: Database["public"]["Enums"]["organization_sector"];
          created_by: string | null;
          is_verified: boolean;
          contact_email: string | null;
          contact_phone: string | null;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sector: Database["public"]["Enums"]["organization_sector"];
          created_by?: string | null;
          is_verified?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sector?: Database["public"]["Enums"]["organization_sector"];
          created_by?: string | null;
          is_verified?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_access_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_sector: Database["public"]["Enums"]["organization_sector"];
          organization_name: string;
          designation: string;
          status: Database["public"]["Enums"]["admin_access_request_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requested_sector: Database["public"]["Enums"]["organization_sector"];
          organization_name: string;
          designation: string;
          status?: Database["public"]["Enums"]["admin_access_request_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          requested_sector?: Database["public"]["Enums"]["organization_sector"];
          organization_name?: string;
          designation?: string;
          status?: Database["public"]["Enums"]["admin_access_request_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_access_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_access_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: TableDefinition<JobRow, Partial<JobRow> & { organization_id: string; title: string; description: string; location: string; employment_type: string }, Partial<JobRow>>;
      courses: TableDefinition<CourseRow, Partial<CourseRow> & { organization_id: string; title: string; description: string; delivery_mode: CourseRow["delivery_mode"]; course_url: string }, Partial<CourseRow>>;
      saved_jobs: TableDefinition<
        { candidate_id: string; job_id: string; created_at: string },
        { candidate_id: string; job_id: string; created_at?: string },
        never
      >;
      saved_courses: TableDefinition<
        { candidate_id: string; course_id: string; created_at: string },
        { candidate_id: string; course_id: string; created_at?: string },
        never
      >;
      applications: TableDefinition<
        ApplicationRow,
        never,
        { status?: ApplicationRow["status"]; status_changed_at?: string }
      >;
      application_status_history: TableDefinition<
        {
          id: string;
          application_id: string;
          changed_by: string;
          previous_status: ApplicationRow["status"];
          new_status: ApplicationRow["status"];
          changed_at: string;
        },
        never,
        never
      >;
      course_interactions: TableDefinition<
        {
          id: string;
          candidate_id: string;
          course_id: string;
          interaction_type: "link_click" | "inquiry";
          request_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          candidate_id: string;
          course_id: string;
          interaction_type: "link_click" | "inquiry";
          request_id?: string | null;
          created_at?: string;
        },
        never
      >;
      notifications: TableDefinition<
        NotificationRow,
        never,
        { read_at: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_active_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_manage_organization: {
        Args: {
          target_sector: Database["public"]["Enums"]["organization_sector"];
        };
        Returns: boolean;
      };
      admin_update_profile: {
        Args: {
          target_user_id: string;
          new_role: Database["public"]["Enums"]["application_role"];
          new_sector: Database["public"]["Enums"]["organization_sector"];
          new_account_status: Database["public"]["Enums"]["account_status"];
        };
        Returns: undefined;
      };
      admin_set_organization_verified: {
        Args: {
          target_organization_id: string;
          verified: boolean;
        };
        Returns: undefined;
      };
      admin_review_access_request: {
        Args: {
          target_request_id: string;
          approve: boolean;
        };
        Returns: undefined;
      };
      check_job_eligibility: {
        Args: { target_job_id: string };
        Returns: { eligible: boolean; reasons: string[] }[];
      };
      apply_to_job: {
        Args: { target_job_id: string };
        Returns: string;
      };
      record_course_interaction: {
        Args: {
          target_course_id: string;
          interaction: Database["public"]["Enums"]["course_interaction_type"];
        };
        Returns: string;
      };
      record_course_interaction_once: {
        Args: {
          target_course_id: string;
          interaction: Database["public"]["Enums"]["course_interaction_type"];
          request_key: string;
        };
        Returns: string;
      };
      provider_course_metrics: {
        Args: Record<string, never>;
        Returns: {
          course_id: string;
          saved_count: number;
          inquiry_count: number;
          link_click_count: number;
          confirmed_enrollment_count: number | null;
        }[];
      };
      admin_update_application_status: {
        Args: {
          target_application_id: string;
          new_status: Database["public"]["Enums"]["application_status"];
        };
        Returns: undefined;
      };
    };
    Enums: {
      application_role: "job_seeker" | "admin" | "training_provider";
      organization_sector: "government" | "private";
      account_status: "active" | "suspended";
      admin_access_request_status: "pending" | "approved" | "rejected";
      job_publication_status: "draft" | "published" | "closed";
      course_publication_status: "draft" | "published" | "closed";
      application_status:
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "rejected"
        | "selected"
        | "withdrawn";
      course_interaction_type: "link_click" | "inquiry";
    };
    CompositeTypes: Record<string, never>;
  };
};
