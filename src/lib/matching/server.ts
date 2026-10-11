import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  EligibilityResult,
  JobRecommendations,
  SkillGapAnalysis,
} from "@/lib/matching/types";

export class MatchingServiceError extends Error {
  constructor(message = "The matching service is unavailable.") {
    super(message);
    this.name = "MatchingServiceError";
  }
}

async function requestMatchingApi<T>(
  supabase: SupabaseClient<Database>,
  endpoint: string,
  validate: (value: unknown) => value is T,
): Promise<T> {
  const baseUrl = process.env.MATCHING_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new MatchingServiceError();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new MatchingServiceError();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new MatchingServiceError();
  }

  if (!response.ok) throw new MatchingServiceError();
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new MatchingServiceError();
  }
  if (!validate(payload)) throw new MatchingServiceError();
  return payload;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEligibilityResult(value: unknown): value is EligibilityResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.job_id === "string" &&
    ["eligible", "ineligible", "needs_verification"].includes(
      String(result.status),
    ) &&
    Array.isArray(result.criteria) &&
    result.criteria.every(
      (criterion) =>
        typeof criterion === "object" &&
        criterion !== null &&
        typeof (criterion as Record<string, unknown>).criterion === "string" &&
        ["pass", "fail", "needs_verification"].includes(
          String((criterion as Record<string, unknown>).status),
        ) &&
        typeof (criterion as Record<string, unknown>).reason === "string" &&
        isNullableString(
          (criterion as Record<string, unknown>).requirement,
        ) &&
        isNullableString((criterion as Record<string, unknown>).evidence),
    ) &&
    isStringArray(result.reasons) &&
    isStringArray(result.skill_gaps)
  );
}

function isJobRecommendations(value: unknown): value is JobRecommendations {
  if (typeof value !== "object" || value === null) return false;
  const recommendations = (value as Record<string, unknown>).recommendations;
  return (
    Array.isArray(recommendations) &&
    recommendations.every(
      (item) => {
        if (typeof item !== "object" || item === null) return false;
        const recommendation = item as Record<string, unknown>;
        const job = recommendation.job;
        if (typeof job !== "object" || job === null) return false;
        const row = job as Record<string, unknown>;
        return (
          typeof recommendation.job_id === "string" &&
          typeof recommendation.title === "string" &&
          typeof recommendation.score === "number" &&
          Number.isFinite(recommendation.score) &&
          recommendation.score >= 0 &&
          recommendation.score <= 1 &&
          isStringArray(recommendation.explicit_matches) &&
          isStringArray(recommendation.semantic_matches) &&
          isStringArray(recommendation.skill_gaps) &&
          isStringArray(recommendation.preference_matches) &&
          isStringArray(recommendation.explanation) &&
          typeof row.id === "string" &&
          typeof row.organization_id === "string" &&
          typeof row.title === "string" &&
          typeof row.location === "string" &&
          typeof row.employment_type === "string" &&
          isStringArray(row.required_skills) &&
          isStringArray(row.preferred_skills) &&
          isNullableString(row.application_deadline)
        );
      },
    )
  );
}

function isSkillGapAnalysis(value: unknown): value is SkillGapAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.job_id === "string" &&
    isStringArray(result.skill_gaps) &&
    Array.isArray(result.courses) &&
    result.courses.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isValidRecommendedCourse(item as Record<string, unknown>),
    )
  );
}

function isValidRecommendedCourse(value: Record<string, unknown>): boolean {
  const course = value.course;
  if (typeof course !== "object" || course === null) return false;
  const row = course as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.course_url === "string" &&
    isStringArray(row.skills_taught) &&
    typeof row.delivery_mode === "string" &&
    isNullableString(row.duration) &&
    typeof value.explanation === "string" &&
    isStringArray(value.matching_skills)
  );
}

export function getJobEligibility(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<EligibilityResult> {
  return requestMatchingApi(
    supabase,
    `/v1/jobs/${encodeURIComponent(jobId)}/eligibility`,
    isEligibilityResult,
  ).then((result) => {
    if (result.job_id !== jobId) throw new MatchingServiceError();
    return result;
  });
}

export function getJobRecommendations(
  supabase: SupabaseClient<Database>,
): Promise<JobRecommendations> {
  return requestMatchingApi(
    supabase,
    "/v1/recommendations/jobs",
    isJobRecommendations,
  );
}

export function getSkillGapAnalysis(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<SkillGapAnalysis> {
  return requestMatchingApi(
    supabase,
    `/v1/jobs/${encodeURIComponent(jobId)}/skill-gaps`,
    isSkillGapAnalysis,
  ).then((result) => {
    if (result.job_id !== jobId) throw new MatchingServiceError();
    return result;
  });
}
