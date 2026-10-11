import { describe, expect, it } from "vitest";

import {
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  validatePassword,
} from "@/lib/auth-validation";

describe("authentication field validation", () => {
  it("validates email without exposing a different message for whitespace", () => {
    expect(validateEmail("")).toBe("Enter your email address.");
    expect(validateEmail("  ")).toBe("Enter your email address.");
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(validateEmail("a".repeat(250) + "@example.com")).toBe(
      "Enter a valid email address.",
    );
    expect(validateEmail("person@example.com")).toBeUndefined();
  });

  it("only requires a non-empty password at login", () => {
    expect(validateLoginPassword("")).toBe("Enter your password.");
    expect(validateLoginPassword("legacy")).toBeUndefined();
  });

  it("applies strong password rules when setting a new password", () => {
    expect(validatePassword("short")).toMatch(/10–128 characters/i);
    expect(validatePassword("longpasswordonly")).toMatch(/letter and one number/i);
    expect(validatePassword("longpassword123")).toBeUndefined();
    expect(validatePassword("a".repeat(129) + "1")).toMatch(/10–128 characters/i);
  });

  it("reports password confirmation errors independently", () => {
    expect(validateNewPassword("", "")).toEqual({
      password: "Enter your password.",
      confirmPassword: "Confirm your password.",
    });
    expect(
      validateNewPassword("longpassword123", "differentpassword123"),
    ).toEqual({ confirmPassword: "Your passwords do not match." });
  });
});
