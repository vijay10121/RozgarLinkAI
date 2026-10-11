import { describe, expect, it } from "vitest";

import {
  parseAdminJobInput,
  validAdminStatusTransition,
} from "@/lib/admin/validation";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function validForm(): FormData {
  const data = new FormData();
  data.set("organization_id", organizationId);
  data.set("title", "Support Engineer");
  data.set("description", "Help customers resolve technical issues.");
  data.set("location", "Dhaka");
  data.set("employment_type", "full_time");
  data.set("min_experience_years", "2");
  data.set("required_skills", "Support, support, Documentation");
  data.set("required_qualifications", "Diploma");
  data.set("preferred_skills", "English");
  data.set("location_restrictions", "Dhaka, Chattogram");
  data.set("application_instructions", "Submit through RozgarLink.");
  return data;
}

describe("admin job validation", () => {
  it("validates the required job fields and normalizes skills", () => {
    const parsed = parseAdminJobInput(validForm());

    expect(parsed.error).toBeUndefined();
    expect(parsed.data).toMatchObject({
      organizationId,
      title: "Support Engineer",
      experienceYears: 2,
      requiredSkills: ["Support", "Documentation"],
      qualifications: ["Diploma"],
      locationRestrictions: ["Dhaka", "Chattogram"],
    });
  });

  it("rejects invalid organization IDs, employment types, and experience bounds", () => {
    const missingOrganization = validForm();
    missingOrganization.set("organization_id", "not-an-id");
    expect(parseAdminJobInput(missingOrganization).error).toMatch(/organization/i);

    const invalidType = validForm();
    invalidType.set("employment_type", "volunteer");
    expect(parseAdminJobInput(invalidType).error).toMatch(/employment type/i);

    const invalidExperience = validForm();
    invalidExperience.set("min_experience_years", "81");
    expect(parseAdminJobInput(invalidExperience).error).toMatch(/experience/i);
  });
});

describe("application status transitions", () => {
  it("permits only intended forward and review transitions", () => {
    expect(validAdminStatusTransition("submitted", "under_review")).toBe(true);
    expect(validAdminStatusTransition("under_review", "shortlisted")).toBe(true);
    expect(validAdminStatusTransition("shortlisted", "selected")).toBe(true);
    expect(validAdminStatusTransition("submitted", "selected")).toBe(false);
    expect(validAdminStatusTransition("selected", "rejected")).toBe(false);
    expect(validAdminStatusTransition("rejected", "under_review")).toBe(false);
  });
});
