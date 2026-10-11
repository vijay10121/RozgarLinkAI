import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  getJobEligibility: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/matching/server", () => ({
  getJobEligibility: mocks.getJobEligibility,
}));

import {
  applyToJobAction,
  markNotificationReadAction,
  recordCourseInterestAction,
  toggleSavedJobAction,
  updateSeekerProfileAction,
} from "@/app/seeker/actions";
import {
  getPublishedJobs,
  isMissingMarketplaceSchemaError,
  profileCompletion,
  searchPublishedJobs,
  splitUniqueList,
  type SeekerProfile,
  type SeekerSupabase,
} from "@/lib/seeker/data";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const notificationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createQuery(data: unknown = null, error: unknown = null) {
  const query = {
    data,
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    ilike: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data, error }).then(resolve),
  };
  return query;
}

function setupActionClient(query = createQuery()) {
  const supabase = {
    from: vi.fn(() => query),
    rpc: vi.fn(),
  };
  mocks.requireRole.mockResolvedValue({
    supabase,
    user: { id: userId },
  });
  return { query, supabase };
}

describe("seeker profile utilities", () => {
  it("recognizes missing marketplace schema errors without suppressing other failures", () => {
    expect(isMissingMarketplaceSchemaError({ code: "PGRST205" })).toBe(true);
    expect(isMissingMarketplaceSchemaError({ code: "42P01" })).toBe(true);
    expect(isMissingMarketplaceSchemaError({ code: "08006" })).toBe(false);
    expect(isMissingMarketplaceSchemaError(null)).toBe(false);
  });

  it("normalizes and de-duplicates profile lists case-insensitively", () => {
    expect(
      splitUniqueList(" TypeScript, typescript \n React  Native , , SQL "),
    ).toEqual(["TypeScript", "React Native", "SQL"]);
  });

  it("calculates completion from persisted profile fields", () => {
    const profile = {
      display_name: "Candidate",
      location: "Dhaka",
      education: "Diploma",
      qualifications: ["Diploma"],
      skills: ["React"],
      experience_years: 1,
      preferred_roles: ["Developer"],
      preferred_locations: ["Dhaka"],
    } as SeekerProfile;

    expect(profileCompletion(profile)).toBe(100);
  });

  it("handles profile fields absent before the marketplace migration", () => {
    const legacyProfile: SeekerProfile = {
      id: userId,
      display_name: "Candidate",
      location: null,
      role: "job_seeker",
      sector: null,
      designation: null,
      phone: null,
      specialization: null,
      terms_accepted_at: null,
      account_status: "active",
      education: null,
      qualifications: [],
      skills: [],
      experience_years: null,
      preferred_roles: [],
      preferred_locations: [],
      resume_path: null,
      created_at: "",
      updated_at: "",
    };
    Reflect.deleteProperty(legacyProfile, "education");
    Reflect.deleteProperty(legacyProfile, "qualifications");
    Reflect.deleteProperty(legacyProfile, "skills");
    Reflect.deleteProperty(legacyProfile, "experience_years");
    Reflect.deleteProperty(legacyProfile, "preferred_roles");
    Reflect.deleteProperty(legacyProfile, "preferred_locations");

    expect(profileCompletion(legacyProfile)).toBe(13);
  });
});

describe("job discovery", () => {
  it("queries only published jobs and applies all requested search filters", async () => {
    const query = createQuery([]);
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SeekerSupabase;

    const jobs = await getPublishedJobs(supabase, {
      title: "engineer",
      location: "Dhaka",
      skill: "TypeScript",
      employmentType: "full_time",
    });

    expect(jobs).toEqual([]);
    expect(supabase.from).toHaveBeenCalledWith("jobs");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
    expect(query.ilike).toHaveBeenCalledWith("title", "%engineer%");
    expect(query.ilike).toHaveBeenCalledWith("location", "%Dhaka%");
    expect(query.eq).toHaveBeenCalledWith("employment_type", "full_time");
  });

  it("returns an unavailable schema state for a missing jobs table", async () => {
    const query = createQuery(null, {
      code: "PGRST205",
      message: "jobs table missing",
    });
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SeekerSupabase;

    await expect(searchPublishedJobs(supabase)).resolves.toEqual({
      available: false,
      jobs: [],
    });
  });
});

describe("seeker server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists profile updates for the authenticated user and de-duplicates skills", async () => {
    const { query } = setupActionClient();
    const formData = new FormData();
    formData.set("display_name", "Candidate");
    formData.set("skills", "TypeScript, typescript, React");
    formData.set("qualifications", "Diploma");
    formData.set("preferred_roles", "Engineer");
    formData.set("preferred_locations", "Dhaka");

    const result = await updateSeekerProfileAction({}, formData);

    expect(result.success).toBe("Your profile has been saved.");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Candidate",
        skills: ["TypeScript", "React"],
      }),
    );
    expect(query.eq).toHaveBeenCalledWith("id", userId);
  });

  it("records course inquiries using a request key for idempotent event counting", async () => {
    const { supabase } = setupActionClient();
    supabase.rpc.mockResolvedValue({ error: null });
    const requestId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const formData = new FormData();
    formData.set("course_id", jobId);
    formData.set("request_id", requestId);

    const result = await recordCourseInterestAction({}, formData);

    expect(result.success).toMatch(/not an enrollment confirmation/i);
    expect(supabase.rpc).toHaveBeenCalledWith("record_course_interaction_once", {
      target_course_id: jobId,
      interaction: "inquiry",
      request_key: requestId,
    });
  });

  it("rejects out-of-range profile updates before database access", async () => {
    const formData = new FormData();
    formData.set("experience_years", "81");

    const result = await updateSeekerProfileAction({}, formData);

    expect(result.error).toBe("Review the highlighted profile limits and try again.");
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });

  it("saves jobs against the authenticated candidate rather than submitted ownership", async () => {
    const query = createQuery(null);
    const { supabase } = setupActionClient(query);
    const formData = new FormData();
    formData.set("job_id", jobId);
    formData.set("candidate_id", "dddddddd-dddd-4ddd-8ddd-dddddddddddd");

    const result = await toggleSavedJobAction({}, formData);

    expect(result.success).toBe("Job saved.");
    expect(query.eq).toHaveBeenCalledWith("candidate_id", userId);
    expect(query.insert).toHaveBeenCalledWith({
      candidate_id: userId,
      job_id: jobId,
    });
    expect(supabase.from).toHaveBeenCalledWith("saved_jobs");
  });

  it("does not report success when the database rejects a duplicate application", async () => {
    const { supabase } = setupActionClient();
    mocks.getJobEligibility.mockResolvedValue({
      job_id: jobId,
      status: "eligible",
      criteria: [],
      reasons: [],
      skill_gaps: [],
    });
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "23505" },
    });
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await applyToJobAction({}, formData);

    expect(result).toEqual({ error: "You have already applied to this job." });
    expect(mocks.getJobEligibility).toHaveBeenCalledWith(supabase, jobId);
    expect(supabase.rpc).toHaveBeenCalledWith("apply_to_job", {
      target_job_id: jobId,
    });
  });

  it("does not submit an application when the server eligibility check fails", async () => {
    const { supabase } = setupActionClient();
    mocks.getJobEligibility.mockResolvedValue({
      job_id: jobId,
      status: "ineligible",
      criteria: [],
      reasons: ["Missing required skills: TypeScript."],
      skill_gaps: ["TypeScript"],
    });
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await applyToJobAction({}, formData);

    expect(result.error).toContain("Missing required skills: TypeScript.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("does not allow applications while mandatory profile data needs verification", async () => {
    const { supabase } = setupActionClient();
    mocks.getJobEligibility.mockResolvedValue({
      job_id: jobId,
      status: "needs_verification",
      criteria: [],
      reasons: ["The candidate profile does not provide skill evidence."],
      skill_gaps: ["Python"],
    });
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await applyToJobAction({}, formData);

    expect(result.error).toContain("Eligibility needs verification.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the matching API cannot verify eligibility", async () => {
    const { supabase } = setupActionClient();
    mocks.getJobEligibility.mockRejectedValue(new Error("offline"));
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await applyToJobAction({}, formData);

    expect(result.error).toContain("matching service is unavailable");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects application actions when the server role check fails", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Forbidden"));
    const formData = new FormData();
    formData.set("job_id", jobId);

    await expect(applyToJobAction({}, formData)).rejects.toThrow("Forbidden");
  });

  it("scopes notification updates to the authenticated owner", async () => {
    const { query } = setupActionClient(createQuery({ id: notificationId }));
    const formData = new FormData();
    formData.set("notification_id", notificationId);

    const result = await markNotificationReadAction({}, formData);

    expect(result.success).toBe("Notification marked as read.");
    expect(query.eq).toHaveBeenCalledWith("id", notificationId);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("does not report an update when notification RLS returns no owned row", async () => {
    setupActionClient(createQuery(null));
    const formData = new FormData();
    formData.set("notification_id", notificationId);

    const result = await markNotificationReadAction({}, formData);

    expect(result).toEqual({
      error: "Notification not found or no longer available.",
    });
  });
});
