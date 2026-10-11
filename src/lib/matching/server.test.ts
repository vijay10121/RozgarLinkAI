import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getJobEligibility,
  getJobRecommendations,
  MatchingServiceError,
} from "@/lib/matching/server";

function makeSupabase(accessToken: string | null = "candidate-token") {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      })),
    },
  } as unknown as Parameters<typeof getJobEligibility>[0];
}

describe("server-side matching API client", () => {
  beforeEach(() => {
    vi.stubEnv("MATCHING_API_URL", "http://127.0.0.1:8000/");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the authenticated session token and accepts a valid eligibility response", async () => {
    const eligibility = {
      job_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "eligible",
      criteria: [
        {
          criterion: "required_skills",
          status: "pass",
          requirement: "Python",
          evidence: "Python",
          reason: "Skill explicitly listed.",
        },
      ],
      reasons: [],
      skill_gaps: [],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(eligibility), { status: 200 }),
    );
    const supabase = makeSupabase();

    await expect(
      getJobEligibility(supabase, eligibility.job_id),
    ).resolves.toEqual(eligibility);

    expect(fetch).toHaveBeenCalledWith(
      `http://127.0.0.1:8000/v1/jobs/${eligibility.job_id}/eligibility`,
      expect.objectContaining({
        cache: "no-store",
        headers: { Authorization: "Bearer candidate-token" },
      }),
    );
  });

  it("fails closed when the caller has no access token", async () => {
    await expect(
      getJobEligibility(makeSupabase(null), "job-id"),
    ).rejects.toBeInstanceOf(MatchingServiceError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not interpret invalid or unavailable service responses as recommendations", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ recommendations: "not-an-array" }), {
        status: 200,
      }),
    );

    await expect(
      getJobRecommendations(makeSupabase()),
    ).rejects.toBeInstanceOf(MatchingServiceError);

    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      getJobRecommendations(makeSupabase()),
    ).rejects.toBeInstanceOf(MatchingServiceError);
  });
});
