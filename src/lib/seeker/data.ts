import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type SeekerProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type Notification =
  Database["public"]["Tables"]["notifications"]["Row"];
export type SeekerSupabase = SupabaseClient<Database>;

export type OrganizationSummary = {
  id: string;
  name: string;
};

export type JobFilters = {
  title?: string;
  location?: string;
  skill?: string;
  employmentType?: string;
};

export type PublishedJobsResult =
  | { available: true; jobs: Job[] }
  | { available: false; jobs: [] };

export function isMissingMarketplaceSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = error.code;
  return (
    typeof code === "string" &&
    ["42P01", "PGRST202", "PGRST204", "PGRST205"].includes(code)
  );
}

export function profileCompletion(profile: SeekerProfile): number {
  const qualifications = Array.isArray(profile.qualifications)
    ? profile.qualifications
    : [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const preferredRoles = Array.isArray(profile.preferred_roles)
    ? profile.preferred_roles
    : [];
  const preferredLocations = Array.isArray(profile.preferred_locations)
    ? profile.preferred_locations
    : [];
  const complete = [
    Boolean(profile.display_name?.trim()),
    Boolean(profile.location?.trim()),
    Boolean(profile.education?.trim()),
    qualifications.length > 0,
    skills.length > 0,
    typeof profile.experience_years === "number",
    preferredRoles.length > 0,
    preferredLocations.length > 0,
  ].filter(Boolean).length;

  return Math.round((complete / 8) * 100);
}

export async function getOrganizations(
  supabase: SeekerSupabase,
  organizationIds: string[],
): Promise<Map<string, OrganizationSummary>> {
  const ids = [...new Set(organizationIds)];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", ids);

  if (error) throw error;
  return new Map((data ?? []).map((organization) => [organization.id, organization]));
}

export async function getPublishedJobs(
  supabase: SeekerSupabase,
  filters: JobFilters = {},
): Promise<Job[]> {
  const result = await searchPublishedJobs(supabase, filters);
  if (!result.available) {
    throw Object.assign(
      new Error("The marketplace jobs table is not available."),
      { code: "PGRST205" },
    );
  }
  return result.jobs;
}

export async function searchPublishedJobs(
  supabase: SeekerSupabase,
  filters: JobFilters = {},
): Promise<PublishedJobsResult> {
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const title = filters.title?.trim();
  const location = filters.location?.trim();
  const skill = filters.skill?.trim();

  if (title) query = query.ilike("title", `%${title}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (filters.employmentType) {
    query = query.eq("employment_type", filters.employmentType);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingMarketplaceSchemaError(error)) {
      return { available: false, jobs: [] };
    }
    throw error;
  }
  const jobs = data ?? [];
  if (!skill) return { available: true, jobs };
  const normalizedSkill = skill.toLocaleLowerCase();
  return {
    available: true,
    jobs: jobs.filter((job) =>
      [...job.required_skills, ...job.preferred_skills].some(
        (jobSkill) => jobSkill.toLocaleLowerCase() === normalizedSkill,
      ),
    ),
  };
}

export async function getPublishedCourses(
  supabase: SeekerSupabase,
  search?: string,
): Promise<Course[]> {
  let query = supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const term = search?.trim();
  if (term) query = query.ilike("title", `%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function splitUniqueList(value: FormDataEntryValue | null): string[] {
  const entries = String(value ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 50);
  const unique = new Map<string, string>();

  entries.forEach((entry) => {
    if (entry.length <= 120) {
      const key = entry.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, entry);
    }
  });

  return [...unique.values()];
}

export function safeInternalHref(value: FormDataEntryValue | null): string {
  const href = String(value ?? "/seeker/dashboard");
  return href.startsWith("/seeker/") && !href.startsWith("//")
    ? href
    : "/seeker/dashboard";
}
