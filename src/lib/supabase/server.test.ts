import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: {
    getAll: vi.fn(),
    set: vi.fn(),
  },
  createServerClient: vi.fn((_url: string, _key: string, options: unknown) => ({
    options,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => mocks.cookies,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { createClient } from "@/lib/supabase/server";

describe("server-side Supabase session cookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    mocks.cookies.getAll.mockReturnValue([
      { name: "sb-session", value: "cookie-value" },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("restores the request cookies and persists refreshed session cookies", async () => {
    await createClient();
    const options = mocks.createServerClient.mock.calls[0]?.[2] as {
      cookies: {
        getAll: () => unknown[];
        setAll: (
          entries: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) => void;
      };
    };

    expect(options.cookies.getAll()).toEqual([
      { name: "sb-session", value: "cookie-value" },
    ]);

    const cookieOptions = { path: "/", sameSite: "lax" };
    options.cookies.setAll([
      { name: "sb-session", value: "refreshed-cookie", options: cookieOptions },
    ]);

    expect(mocks.cookies.set).toHaveBeenCalledWith(
      "sb-session",
      "refreshed-cookie",
      cookieOptions,
    );
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-key",
      expect.any(Object),
    );
  });

  it("does not fail when a Server Component cannot write refreshed cookies", async () => {
    mocks.cookies.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    });

    await createClient();
    const options = mocks.createServerClient.mock.calls[0]?.[2] as {
      cookies: {
        setAll: (
          entries: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) => void;
      };
    };

    expect(() =>
      options.cookies.setAll([
        { name: "sb-session", value: "refreshed-cookie" },
      ]),
    ).not.toThrow();
    expect(mocks.cookies.set).toHaveBeenCalledOnce();
  });
});
