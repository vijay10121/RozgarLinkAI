import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  closeAdminJobAction,
  markAdminNotificationReadAction,
  reviewAdminAccessRequestAction,
  saveAdminJobAction,
  updateAdminApplicationStatusAction,
} from "@/app/admin/actions";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const orgId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const jobId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const applicationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const notificationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const requestId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

type Reply = { data?: unknown; error?: unknown; count?: number };

function createSupabase(replies: Record<string, Reply[]>) {
  const queries: Array<{
    table: string;
    calls: Array<[string, ...unknown[]]>;
  }> = [];
  const supabase = {
    from(table: string) {
      const reply = replies[table]?.shift() ?? { data: null, error: null };
      const query: (typeof queries)[number] = { table, calls: [] };
      queries.push(query);
      const builder: Record<string, (...args: unknown[]) => unknown> = {};
      for (const method of [
        "select",
        "insert",
        "update",
        "delete",
        "eq",
        "in",
        "order",
        "range",
        "limit",
        "ilike",
      ]) {
        builder[method] = (...args: unknown[]) => {
          query.calls.push([method, ...args]);
          return builder;
        };
      }
      builder.maybeSingle = async () => reply;
      builder.single = async () => reply;
      builder.then = (...args: unknown[]) =>
        Promise.resolve(reply).then((value) => {
          const resolve = args[0];
          return typeof resolve === "function" ? resolve(value) : value;
        });
      return builder;
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
  return { supabase, queries };
}

function configure(replies: Record<string, Reply[]>) {
  const { supabase, queries } = createSupabase(replies);
  mocks.requireRole.mockResolvedValue({
    supabase,
    user: { id: userId },
  });
  return { supabase, queries };
}

function jobForm(intent: string) {
  const formData = new FormData();
  formData.set("organization_id", orgId);
  formData.set("title", "Support Engineer");
  formData.set("description", "Help customers resolve technical issues.");
  formData.set("location", "Dhaka");
  formData.set("employment_type", "full_time");
  formData.set("min_experience_years", "2");
  formData.set("required_skills", "Support, Documentation");
  formData.set("required_qualifications", "Diploma");
  formData.set("preferred_skills", "English");
  formData.set("location_restrictions", "Dhaka");
  formData.set("application_instructions", "Apply online.");
  formData.set("intent", intent);
  return formData;
}

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and publishes a validated job only for the admin's organization", async () => {
    const { queries } = configure({
      organizations: [{ data: { id: orgId }, error: null }],
      jobs: [{ data: { id: jobId }, error: null }],
    });

    const result = await saveAdminJobAction({}, jobForm("publish"));

    expect(result.redirectTo).toBe(`/admin/jobs/${jobId}`);
    expect(queries.map((query) => query.table)).toEqual([
      "organizations",
      "jobs",
    ]);
    expect(queries[0].calls).toContainEqual(["eq", "created_by", userId]);
    const insert = queries[1].calls.find(([method]) => method === "insert");
    expect(insert?.[1]).toMatchObject({
      owner_admin_id: userId,
      organization_id: orgId,
      status: "published",
    });
  });

  it("edits a published job only for its owner without changing publication status", async () => {
    const { queries } = configure({
      organizations: [{ data: { id: orgId }, error: null }],
      jobs: [
        {
          data: {
            id: jobId,
            status: "published",
            published_at: "2026-10-01T00:00:00.000Z",
          },
          error: null,
        },
        { data: { id: jobId }, error: null },
      ],
    });
    const formData = jobForm("publish");
    formData.set("job_id", jobId);

    const result = await saveAdminJobAction({}, formData);

    expect(result.redirectTo).toBe(`/admin/jobs/${jobId}`);
    const updateCall = queries[2].calls.find(([method]) => method === "update");
    expect(updateCall?.[1]).toMatchObject({ status: "published" });
    expect(updateCall?.[1]).not.toHaveProperty("published_at");
    expect(queries[2].calls).toContainEqual(["eq", "owner_admin_id", userId]);
  });

  it("does not create a job for an organization owned by someone else", async () => {
    const { queries } = configure({
      organizations: [{ data: null, error: null }],
    });

    const result = await saveAdminJobAction({}, jobForm("draft"));

    expect(result.error).toMatch(/own organization/i);
    expect(queries.map((query) => query.table)).toEqual(["organizations"]);
  });

  it("closes only an owned job and persists the closed state", async () => {
    const { queries } = configure({
      jobs: [
        { data: { id: jobId, status: "published" }, error: null },
        { data: { id: jobId }, error: null },
      ],
    });
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await closeAdminJobAction({}, formData);

    expect(result.success).toBe("Job closed.");
    expect(queries[0].calls).toContainEqual(["eq", "owner_admin_id", userId]);
    expect(queries[1].calls).toContainEqual([
      "update",
      { status: "closed" },
    ]);
  });

  it("updates an authorized application through the atomic history-and-notification workflow", async () => {
    const { supabase } = configure({
      applications: [
        {
          data: {
            id: applicationId,
            job_id: jobId,
            status: "submitted",
          },
          error: null,
        },
      ],
      jobs: [{ data: { id: jobId }, error: null }],
    });
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("status", "under_review");

    const result = await updateAdminApplicationStatusAction({}, formData);

    expect(result.success).toMatch(/candidate notified/i);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "admin_update_application_status",
      {
        target_application_id: applicationId,
        new_status: "under_review",
      },
    );
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("blocks status updates for another organization's application", async () => {
    const { supabase } = configure({
      applications: [
        {
          data: {
            id: applicationId,
            job_id: jobId,
            status: "submitted",
          },
          error: null,
        },
      ],
      jobs: [{ data: null, error: null }],
    });
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("status", "under_review");

    const result = await updateAdminApplicationStatusAction({}, formData);

    expect(result.error).toMatch(/another organization/i);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("refuses to close a job that does not belong to this admin", async () => {
    const { queries } = configure({
      jobs: [{ data: null, error: null }],
    });
    const formData = new FormData();
    formData.set("job_id", jobId);

    const result = await closeAdminJobAction({}, formData);

    expect(result.error).toMatch(/not available/i);
    expect(queries).toHaveLength(1);
  });

  it("marks only the admin's own notification as read", async () => {
    const { queries } = configure({
      notifications: [{ data: { id: notificationId }, error: null }],
    });
    const formData = new FormData();
    formData.set("notification_id", notificationId);

    const result = await markAdminNotificationReadAction({}, formData);

    expect(result.success).toBe("Notification marked as read.");
    expect(queries[0].calls).toContainEqual(["eq", "user_id", userId]);
  });

  it("reviews admin access through the privileged database function", async () => {
    const { supabase } = configure({});
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("decision", "approve");

    const result = await reviewAdminAccessRequestAction({}, formData);

    expect(result.success).toMatch(/applicant can log in/i);
    expect(supabase.rpc).toHaveBeenCalledWith("admin_review_access_request", {
      target_request_id: requestId,
      approve: true,
    });
  });
});
