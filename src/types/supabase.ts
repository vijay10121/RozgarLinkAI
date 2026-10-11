import type { Database } from "@/types/database";

export type ApplicationRole =
  Database["public"]["Enums"]["application_role"];

export type OrganizationSector =
  Database["public"]["Enums"]["organization_sector"];

export type AccountStatus = Database["public"]["Enums"]["account_status"];

export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type Organization =
  Database["public"]["Tables"]["organizations"]["Row"];
