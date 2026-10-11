export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["application_role"];
          sector: Database["public"]["Enums"]["organization_sector"] | null;
          display_name: string | null;
          account_status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["application_role"];
          sector?: Database["public"]["Enums"]["organization_sector"] | null;
          display_name?: string | null;
          account_status?: Database["public"]["Enums"]["account_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["application_role"];
          sector?: Database["public"]["Enums"]["organization_sector"] | null;
          display_name?: string | null;
          account_status?: Database["public"]["Enums"]["account_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          sector: Database["public"]["Enums"]["organization_sector"];
          created_by: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sector: Database["public"]["Enums"]["organization_sector"];
          created_by?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sector?: Database["public"]["Enums"]["organization_sector"];
          created_by?: string | null;
          is_verified?: boolean;
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
    };
    Enums: {
      application_role: "job_seeker" | "admin" | "training_provider";
      organization_sector: "government" | "private";
      account_status: "active" | "suspended";
    };
    CompositeTypes: Record<string, never>;
  };
};
