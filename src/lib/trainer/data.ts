import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type TrainerCourse = Database["public"]["Tables"]["courses"]["Row"];
export type TrainerOrganization =
  Database["public"]["Tables"]["organizations"]["Row"];
export type TrainerClient = SupabaseClient<Database>;

export async function getTrainerOrganization(
  supabase: TrainerClient,
  userId: string,
  sector: "government" | "private",
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("created_by", userId)
    .eq("sector", sector)
    .maybeSingle();

  if (error) throw error;
  return data;
}
