import { describe, expect, it } from "vitest";

import {
  getDashboardPath,
  getRoleForPrivatePath,
  isDashboardPath,
  isMissingAuthSessionError,
} from "@/lib/auth-routing";

describe("role-based authentication routing", () => {
  it("maps every database role to its required dashboard", () => {
    expect(getDashboardPath("job_seeker")).toBe("/seeker/dashboard");
    expect(getDashboardPath("admin")).toBe("/admin/dashboard");
    expect(getDashboardPath("training_provider")).toBe("/trainer/dashboard");
  });

  it("identifies role-owned paths without trusting caller-supplied roles", () => {
    expect(getRoleForPrivatePath("/seeker/dashboard")).toBe("job_seeker");
    expect(getRoleForPrivatePath("/seeker/saved-jobs")).toBe("job_seeker");
    expect(getRoleForPrivatePath("/admin/dashboard")).toBe("admin");
    expect(getRoleForPrivatePath("/admin/users/123")).toBe("admin");
    expect(getRoleForPrivatePath("/trainer/dashboard")).toBe(
      "training_provider",
    );
    expect(getRoleForPrivatePath("/trainer/courses")).toBe("training_provider");
    expect(getRoleForPrivatePath("/login")).toBeNull();
    expect(getRoleForPrivatePath("/administrator")).toBeNull();
    expect(isDashboardPath("/admin/dashboard")).toBe(true);
    expect(isDashboardPath("/")).toBe(false);
  });

  it("distinguishes an expired/missing session from an auth service failure", () => {
    expect(isMissingAuthSessionError({ name: "AuthSessionMissingError" })).toBe(
      true,
    );
    expect(
      isMissingAuthSessionError({ message: "Auth session missing!" }),
    ).toBe(true);
    expect(
      isMissingAuthSessionError({ name: "AuthRetryableFetchError" }),
    ).toBe(false);
  });
});
