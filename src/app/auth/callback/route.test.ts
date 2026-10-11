import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

import { GET } from "@/app/auth/callback/route";

describe("Supabase auth callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("exchanges an email-verification code and returns to login", async () => {
    const request = new NextRequest(
      "https://rozgarlink.example/auth/callback?code=one-time-code",
    );
    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe(
      "https://rozgarlink.example/login?verified=1",
    );
  });

  it("returns recovery links only to the fixed password-reset route", async () => {
    const request = new NextRequest(
      "https://rozgarlink.example/auth/callback?code=recovery-code&next=%2Freset-password",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://rozgarlink.example/reset-password",
    );
  });

  it("shows an explicit invalid-link state when code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") });
    const request = new NextRequest(
      "https://rozgarlink.example/auth/callback?code=expired&next=%2Freset-password",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://rozgarlink.example/reset-password?error=link_invalid",
    );
  });

  it("handles temporary exchange failures without exposing provider details", async () => {
    exchangeCodeForSession.mockRejectedValue(new TypeError("fetch failed"));
    const request = new NextRequest(
      "https://rozgarlink.example/auth/callback?code=temporary-failure",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://rozgarlink.example/login?error=email_verification",
    );
  });
});
