import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { AdminApplicationStatus } from "@/lib/admin/validation";

export type AdminSupabase = SupabaseClient<Database>;
export type AdminJob = Database["public"]["Tables"]["jobs"]["Row"];
export type AdminApplication =
  Database["public"]["Tables"]["applications"]["Row"];
export type AdminOrganization =
  Database["public"]["Tables"]["organizations"]["Row"];
export type AdminCandidate = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "display_name"
  | "location"
  | "education"
  | "qualifications"
  | "skills"
  | "experience_years"
>;
export type AdminJobOption = Pick<AdminJob, "id" | "title" | "status">;

export type ApplicationListItem = {
  application: AdminApplication;
  candidate: AdminCandidate | undefined;
  job: Pick<AdminJob, "id" | "title" | "organization_id"> | undefined;
};

export function boundedPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) ? Math.max(1, Math.min(page, 10000)) : 1;
}

export async function getOwnOrganizations(
  supabase: AdminSupabase,
  adminId: string,
): Promise<AdminOrganization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("created_by", adminId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getOwnedJob(
  supabase: AdminSupabase,
  adminId: string,
  jobId: string,
): Promise<AdminJob | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("owner_admin_id", adminId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOwnedJobIds(
  supabase: AdminSupabase,
  adminId: string,
): Promise<string[]> {
  const ids: string[] = [];
  const batchSize = 500;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id")
      .eq("owner_admin_id", adminId)
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    ids.push(...batch.map((job) => job.id));
    if (batch.length < batchSize) return ids;
    offset += batchSize;
  }
}

export async function getOwnedJobOptions(
  supabase: AdminSupabase,
  adminId: string,
): Promise<AdminJobOption[]> {
  const jobs: AdminJobOption[] = [];
  const batchSize = 500;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status")
      .eq("owner_admin_id", adminId)
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    jobs.push(...batch);
    if (batch.length < batchSize) return jobs;
    offset += batchSize;
  }
}

export async function getApplicationsForAdminJobs(
  supabase: AdminSupabase,
  adminId: string,
  jobIds: string[],
  options: {
    limit?: number;
    jobId?: string;
    status?: AdminApplicationStatus;
    range?: [number, number];
  } = {},
): Promise<{ items: ApplicationListItem[]; count: number }> {
  if (jobIds.length === 0) return { items: [], count: 0 };
  if (options.jobId && !jobIds.includes(options.jobId)) {
    return { items: [], count: 0 };
  }
  let query = supabase
    .from("applications")
    .select("*", { count: "exact" })
    .in("job_id", options.jobId ? [options.jobId] : jobIds)
    .order("submitted_at", { ascending: false });
  if (options.status) query = query.eq("status", options.status);
  if (options.range) query = query.range(options.range[0], options.range[1]);
  else if (options.limit !== undefined) query = query.limit(options.limit);
  const { data: applications, count, error } = await query;
  if (error) throw error;

  const rows = applications ?? [];
  if (rows.length === 0) return { items: [], count: count ?? 0 };
  const candidateIds = [...new Set(rows.map((row) => row.candidate_id))];
  const { data: candidates, error: candidatesError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, location, education, qualifications, skills, experience_years",
    )
    .in("id", candidateIds)
    .eq("role", "job_seeker");
  if (candidatesError) throw candidatesError;

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, organization_id")
    .eq("owner_admin_id", adminId)
    .in("id", jobIds);
  if (jobsError) throw jobsError;

  const candidateById = new Map(
    (candidates ?? []).map((candidate) => [candidate.id, candidate]),
  );
  const jobById = new Map((jobs ?? []).map((job) => [job.id, job]));
  return {
    items: rows.map((application) => ({
      application,
      candidate: candidateById.get(application.candidate_id),
      job: jobById.get(application.job_id),
    })),
    count: count ?? rows.length,
  };
}
