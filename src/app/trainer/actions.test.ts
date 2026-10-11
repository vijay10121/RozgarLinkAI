import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  queryResult: { data: null as unknown, error: null as unknown },
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  archiveTrainerCourseAction,
  markTrainerNotificationReadAction,
  saveTrainerCourseAction,
} from "@/app/trainer/actions";

const providerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const courseId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createQuery() {
  const query = {
    select: vi.fn(() => query),
    insert: mocks.insert.mockImplementation(() => query),
    update: mocks.update.mockImplementation(() => query),
    eq: mocks.eq.mockImplementation(() => query),
    neq: mocks.neq.mockImplementation(() => query),
    maybeSingle: mocks.maybeSingle,
    single: mocks.single,
    then: (
      resolve: (value: typeof mocks.queryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(mocks.queryResult).then(resolve, reject),
  };
  return query;
}

function courseForm(intent: "draft" | "publish", id = "") {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("course_id", id);
  formData.set("title", "Data analysis foundations");
  formData.set("description", "A real course offered by the provider.");
  formData.set("specialization", "Analytics");
  formData.set("skills_taught", "SQL, Reporting");
  formData.set("difficulty_level", "beginner");
  formData.set("duration", "six weeks");
  formData.set("delivery_mode", "online");
  formData.set("course_url", "https://provider.example/course");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryResult = { data: null, error: null };
  const query = createQuery();
  mocks.from.mockReturnValue(query);
  mocks.maybeSingle.mockResolvedValue({
    data: {
      id: organizationId,
      created_by: providerId,
      sector: "private",
    },
    error: null,
  });
  mocks.single.mockResolvedValue({ data: { id: courseId }, error: null });
  mocks.requireRole.mockResolvedValue({
    supabase: { from: mocks.from },
    user: { id: providerId },
    profile: { sector: "private" },
  });
});

describe("training provider course actions", () => {
  it("creates a real provider-owned draft against the provider organization", async () => {
    const result = await saveTrainerCourseAction({}, courseForm("draft"));

    expect(result.success).toBe("Draft saved.");
    expect(result.redirectTo).toBe(`/trainer/courses/${courseId}`);
    expect(mocks.from).toHaveBeenCalledWith("organizations");
    expect(mocks.from).toHaveBeenCalledWith("courses");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: organizationId,
        owner_provider_id: providerId,
        status: "draft",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seeker/courses");
  });

  it("publishes through the provider-owned course write path", async () => {
    const result = await saveTrainerCourseAction({}, courseForm("publish"));

    expect(result.success).toBe("Course published.");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" }),
    );
  });

  it("updates an existing owned draft with validated course fields", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { id: organizationId, created_by: providerId, sector: "private" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: courseId, status: "draft" },
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: courseId }, error: null });

    const result = await saveTrainerCourseAction(
      {},
      courseForm("draft", courseId),
    );

    expect(result.success).toBe("Draft saved.");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Data analysis foundations",
        specialization: "Analytics",
        status: "draft",
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("owner_provider_id", providerId);
  });

  it("does not update a course that is not visible to the provider", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: {
          id: organizationId,
          created_by: providerId,
          sector: "private",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await saveTrainerCourseAction(
      {},
      courseForm("publish", courseId),
    );

    expect(result.error).toMatch(/not available to you/i);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not allow archived courses to be edited or republished", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { id: organizationId, created_by: providerId, sector: "private" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: courseId, status: "closed" },
        error: null,
      });

    const result = await saveTrainerCourseAction(
      {},
      courseForm("publish", courseId),
    );

    expect(result.error).toMatch(/archived courses/i);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not revert a published course to draft", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { id: organizationId, created_by: providerId, sector: "private" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: courseId, status: "published" },
        error: null,
      });

    const result = await saveTrainerCourseAction(
      {},
      courseForm("draft", courseId),
    );

    expect(result.error).toMatch(/can’t be reverted to drafts/i);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a course image path owned by another provider", async () => {
    const formData = courseForm("draft");
    formData.set("image_path", `${organizationId}/course.png`);

    const result = await saveTrainerCourseAction({}, formData);

    expect(result.error).toMatch(/must belong to your provider account/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("archives only the authenticated provider's own course", async () => {
    mocks.queryResult = { data: { id: courseId }, error: null };
    const formData = new FormData();
    formData.set("course_id", courseId);

    const result = await archiveTrainerCourseAction({}, formData);

    expect(result.success).toBe("Course archived.");
    expect(mocks.update).toHaveBeenCalledWith({ status: "closed" });
    expect(mocks.eq).toHaveBeenCalledWith("owner_provider_id", providerId);
    expect(mocks.neq).toHaveBeenCalledWith("status", "closed");
  });

  it("marks only an owned provider notification as read", async () => {
    const notificationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: notificationId },
      error: null,
    });
    const formData = new FormData();
    formData.set("notification_id", notificationId);

    const result = await markTrainerNotificationReadAction({}, formData);

    expect(result.success).toBe("Notification marked as read.");
    expect(mocks.from).toHaveBeenCalledWith("notifications");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", providerId);
  });
});
