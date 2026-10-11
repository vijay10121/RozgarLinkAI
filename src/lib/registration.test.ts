import { describe, expect, it } from "vitest";

import {
  getRegistrationErrorMessage,
  getRegistrationMetadata,
  initialRegistrationValues,
  validateRegistration,
  type RegistrationValues,
} from "@/lib/registration";

function validValues(
  overrides: Partial<RegistrationValues> = {},
): RegistrationValues {
  return {
    ...initialRegistrationValues,
    role: "job_seeker",
    fullName: "Alex Morgan",
    email: "alex@example.com",
    password: "longpassword123",
    confirmPassword: "longpassword123",
    termsAccepted: true,
    ...overrides,
  };
}

describe("registration validation", () => {
  it("requires a role and a sector only for organization account types", () => {
    expect(validateRegistration(validValues({ role: "" })).role).toBe(
      "Choose an account type.",
    );
    expect(
      validateRegistration(validValues({ role: "job_seeker" })).sector,
    ).toBeUndefined();
    expect(validateRegistration(validValues({ role: "admin" })).sector).toBe(
      "Choose a sector.",
    );
    expect(
      validateRegistration(validValues({ role: "training_provider" })).sector,
    ).toBe("Choose a sector.");
  });

  it("validates email, password confirmation, and terms acceptance", () => {
    const errors = validateRegistration(
      validValues({
        email: "not-an-email",
        password: "short",
        confirmPassword: "different",
        termsAccepted: false,
      }),
    );

    expect(errors.email).toBe("Enter a valid email address.");
    expect(errors.password).toBe(
      "Use at least 10 characters for your password.",
    );
    expect(errors.confirmPassword).toBe("Your passwords do not match.");
    expect(errors.termsAccepted).toBe(
      "Accept the terms to create an account.",
    );
  });

  it("requires organization and role-specific fields", () => {
    const adminErrors = validateRegistration(
      validValues({ role: "admin", sector: "private" }),
    );
    const providerErrors = validateRegistration(
      validValues({ role: "training_provider", sector: "government" }),
    );

    expect(adminErrors.organizationName).toBeTruthy();
    expect(adminErrors.designation).toBeTruthy();
    expect(providerErrors.organizationName).toBeTruthy();
    expect(providerErrors.specialization).toBeTruthy();
  });
});

describe("registration metadata", () => {
  it("only includes a sector for admin/provider accounts", () => {
    expect(
      getRegistrationMetadata(
        validValues({ role: "job_seeker", location: "Pune" }),
      ),
    ).toEqual({
      full_name: "Alex Morgan",
      terms_accepted: true,
      account_type: "job_seeker",
      location: "Pune",
    });

    expect(
      getRegistrationMetadata(
        validValues({
          role: "training_provider",
          sector: "private",
          organizationName: "Skill House",
          specialization: "Digital skills",
        }),
      ),
    ).toEqual({
      full_name: "Alex Morgan",
      terms_accepted: true,
      account_type: "training_provider",
      sector: "private",
      organization_name: "Skill House",
      specialization: "Digital skills",
    });
  });

  it("refuses to build privileged metadata without the required sector", () => {
    expect(
      getRegistrationMetadata(
        validValues({
          role: "admin",
          organizationName: "Public Works",
          designation: "Coordinator",
        }),
      ),
    ).toBeNull();
  });
});

describe("registration error messages", () => {
  it("explains duplicate accounts without exposing provider internals", () => {
    expect(
      getRegistrationErrorMessage(new Error("User already registered")),
    ).toMatch(/already exists/i);
  });

  it("explains network failures and has a safe fallback", () => {
    expect(getRegistrationErrorMessage(new TypeError("fetch failed"))).toMatch(
      /connection/i,
    );
    expect(getRegistrationErrorMessage(new Error("database detail"))).toMatch(
      /couldn’t create your account/i,
    );
  });
});
