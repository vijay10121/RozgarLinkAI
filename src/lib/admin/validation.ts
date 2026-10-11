import { splitUniqueList } from "@/lib/seeker/data";

export type AdminJobStatus = "draft" | "published" | "closed";
export type AdminApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "rejected"
  | "selected"
  | "withdrawn";

export type AdminJobInput = {
  organizationId: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  applicationDeadline: string | null;
  applicationInstructions: string;
  mandatoryEducation: string | null;
  locationRestrictions: string[];
  qualifications: string[];
  experienceYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const employmentTypes = new Set([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
]);
const applicationStatuses = new Set<AdminApplicationStatus>([
  "submitted",
  "under_review",
  "shortlisted",
  "rejected",
  "selected",
]);
const statusTransitions: Record<
  Exclude<AdminApplicationStatus, "selected" | "rejected" | "withdrawn">,
  AdminApplicationStatus[]
> = {
  submitted: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected", "selected"],
  shortlisted: ["under_review", "rejected", "selected"],
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseAdminJobInput(
  formData: FormData,
): { data?: AdminJobInput; error?: string } {
  const organizationId = text(formData, "organization_id");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const location = text(formData, "location");
  const employmentType = text(formData, "employment_type");
  const experienceInput = text(formData, "min_experience_years");
  const experienceYears = Number(experienceInput || "0");
  const deadlineInput = text(formData, "application_deadline");
  const applicationDeadline = deadlineInput || null;
  const requiredSkills = splitUniqueList(formData.get("required_skills"));
  const qualifications = splitUniqueList(
    formData.get("required_qualifications"),
  );
  const locationRestrictions = splitUniqueList(
    formData.get("location_restrictions"),
  );

  if (!uuidPattern.test(organizationId)) {
    return { error: "Choose an organization you are authorized to manage." };
  }
  if (title.length < 1 || title.length > 200) {
    return { error: "Job title must be between 1 and 200 characters." };
  }
  if (description.length < 1 || description.length > 20000) {
    return { error: "Description must be between 1 and 20,000 characters." };
  }
  if (location.length < 1 || location.length > 200) {
    return { error: "Location must be between 1 and 200 characters." };
  }
  if (!employmentTypes.has(employmentType)) {
    return { error: "Select a valid employment type." };
  }
  if (
    !Number.isFinite(experienceYears) ||
    experienceYears < 0 ||
    experienceYears > 80
  ) {
    return { error: "Experience must be between 0 and 80 years." };
  }
  if (applicationDeadline) {
    const parsedDeadline = new Date(`${applicationDeadline}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(applicationDeadline) ||
      Number.isNaN(parsedDeadline.getTime()) ||
      parsedDeadline.toISOString().slice(0, 10) !== applicationDeadline
    ) {
      return { error: "Enter a valid application deadline." };
    }
    const intent = text(formData, "intent");
    const today = new Date().toISOString().slice(0, 10);
    if (intent === "publish" && applicationDeadline < today) {
      return { error: "A published job must have a future application deadline." };
    }
  }

  const requirements = text(formData, "requirements");
  const applicationInstructions = text(formData, "application_instructions");
  const mandatoryEducation = text(formData, "mandatory_education") || null;
  if (requirements.length > 20000) {
    return { error: "Additional requirements cannot exceed 20,000 characters." };
  }
  if (applicationInstructions.length > 4000) {
    return { error: "Application instructions cannot exceed 4,000 characters." };
  }
  if (mandatoryEducation && mandatoryEducation.length > 200) {
    return { error: "Mandatory education cannot exceed 200 characters." };
  }

  return {
    data: {
      organizationId,
      title,
      description,
      requirements,
      location,
      employmentType,
      applicationDeadline,
      applicationInstructions,
      mandatoryEducation,
      locationRestrictions,
      qualifications,
      experienceYears,
      requiredSkills,
      preferredSkills: splitUniqueList(formData.get("preferred_skills")),
    },
  };
}

export function isAdminApplicationStatus(
  status: string,
): status is AdminApplicationStatus {
  return applicationStatuses.has(status as AdminApplicationStatus);
}

export function validAdminStatusTransition(
  current: AdminApplicationStatus,
  next: AdminApplicationStatus,
): boolean {
  if (current === next) return false;
  if (current === "withdrawn" || current === "selected" || current === "rejected") {
    return false;
  }
  return statusTransitions[current]?.includes(next) ?? false;
}

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}
