import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
    from: () => ({ select: mocks.select }),
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  forgotPasswordAction,
  loginAction,
  logoutAction,
  updatePasswordAction,
} from "@/app/auth/actions";
import { requireRole } from "@/lib/supabase/auth";

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("server-side Supabase authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({
      data: { role: "job_seeker", account_status: "active" },
      error: null,
    });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates login inputs before making an authentication request", async () => {
    const result = await loginAction({}, formData({ email: "bad", password: "" }));

    expect(result.fieldErrors).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("allows existing credentials to be checked without signup password rules", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });

    const result = await loginAction(
      {},
      formData({ email: "alex@example.com", password: "legacy" }),
    );

    expect(result.error).toMatch(/couldn’t log you in/i);
    expect(result.fieldErrors).toBeUndefined();
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
  });

  it.each([
    ["job_seeker", "/seeker/dashboard"],
    ["admin", "/admin/dashboard"],
    ["training_provider", "/trainer/dashboard"],
  ] as const)("routes by the database profile role: %s", async (role, path) => {
    mocks.maybeSingle.mockResolvedValue({
      data: { role, account_status: "active" },
      error: null,
    });

    await expect(
      loginAction(
        {},
        formData({ email: "alex@example.com", password: "secret-password" }),
      ),
    ).rejects.toThrow(`redirect:${path}`);

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "secret-password",
    });
    expect(mocks.select).toHaveBeenCalledWith("role, account_status");
    expect(mocks.eq).toHaveBeenCalledWith("id", "authenticated-user");
  });

  it("does not retain sessions for suspended users or accounts without profiles", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { role: "admin", account_status: "suspended" },
      error: null,
    });
    const suspended = await loginAction(
      {},
      formData({ email: "alex@example.com", password: "secret-password" }),
    );
    expect(suspended.error).toMatch(/suspended/i);
    expect(mocks.signOut).toHaveBeenCalledOnce();

    mocks.signOut.mockClear();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const missing = await loginAction(
      {},
      formData({ email: "alex@example.com", password: "secret-password" }),
    );
    expect(missing.error).toMatch(/profile is not ready/i);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("handles unverified email without exposing authentication internals", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: new Error("Email not confirmed"),
    });
    const result = await loginAction(
      {},
      formData({ email: "alex@example.com", password: "secret-password" }),
    );

    expect(result.error).toMatch(/verify your email/i);
    expect(result.error).not.toMatch(/confirmed/i);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("logs out through Supabase and returns to the login page", async () => {
    await expect(logoutAction()).rejects.toThrow("redirect:/login?logged_out=1");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("reports logout failures instead of showing a logged-out success state", async () => {
    mocks.signOut.mockRejectedValue(new TypeError("fetch failed"));

    await expect(logoutAction()).rejects.toThrow(
      "redirect:/login?error=logout_failed",
    );
  });

  it("requests reset emails without revealing whether an account exists", async () => {
    const result = await forgotPasswordAction(
      {},
      formData({ email: "alex@example.com" }),
    );

    expect(result.success).toMatch(/if an account exists/i);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "alex@example.com",
      {
        redirectTo:
          "http://localhost:3000/auth/callback?next=/reset-password",
      },
    );
  });

  it("returns a field error for malformed recovery email before sending", async () => {
    const result = await forgotPasswordAction(
      {},
      formData({ email: "not-an-email" }),
    );

    expect(result.fieldErrors?.email).toMatch(/valid email/i);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("requires a configured canonical origin for password recovery", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const result = await forgotPasswordAction(
      {},
      formData({ email: "person@example.com" }),
    );

    expect(result.error).toMatch(/app url is not configured/i);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("requires an authenticated recovery session and matching strong passwords", async () => {
    const mismatch = await updatePasswordAction(
      {},
      formData({
        password: "strongpassword123",
        confirmPassword: "differentpassword123",
      }),
    );
    expect(mismatch.fieldErrors?.confirmPassword).toMatch(/do not match/i);
    expect(mocks.updateUser).not.toHaveBeenCalled();

    await expect(
      updatePasswordAction(
        {},
        formData({
          password: "strongpassword123",
          confirmPassword: "strongpassword123",
        }),
      ),
    ).rejects.toThrow("redirect:/login?password_updated=1");
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: "strongpassword123",
    });
  });

  it("blocks unauthenticated, suspended, and cross-role server access", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    await expect(requireRole("admin")).rejects.toThrow(
      "redirect:/login?error=session_expired",
    );

    mocks.getUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: { role: "job_seeker", account_status: "active" },
      error: null,
    });
    await expect(requireRole("admin")).rejects.toThrow(
      "redirect:/seeker/dashboard",
    );

    mocks.maybeSingle.mockResolvedValue({
      data: { role: "admin", account_status: "suspended" },
      error: null,
    });
    await expect(requireRole("admin")).rejects.toThrow(
      "redirect:/login?error=account_suspended",
    );
  });
});
