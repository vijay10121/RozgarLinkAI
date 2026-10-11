import type {
  ApplicationRole,
  OrganizationSector,
} from "@/types/supabase";

export type RegistrationRole = ApplicationRole;
export type RegistrationSector = OrganizationSector;

export type RegistrationValues = {
  role: RegistrationRole | "";
  sector: RegistrationSector | "";
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  location: string;
  organizationName: string;
  designation: string;
  specialization: string;
};

export type RegistrationErrors = Partial<
  Record<keyof RegistrationValues, string>
>;

export const initialRegistrationValues: RegistrationValues = {
  role: "",
  sector: "",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  location: "",
  organizationName: "",
  designation: "",
  specialization: "",
};

export function validateRegistration(
  values: RegistrationValues,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!values.role) {
    errors.role = "Choose an account type.";
  }

  if (
    (values.role === "admin" || values.role === "training_provider") &&
    !values.sector
  ) {
    errors.sector = "Choose a sector.";
  }

  if (!values.fullName.trim()) {
    errors.fullName = "Enter your full name.";
  } else if (values.fullName.trim().length > 120) {
    errors.fullName = "Your name must be 120 characters or fewer.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length < 10) {
    errors.password = "Use at least 10 characters for your password.";
  } else if (
    values.password.length > 128 ||
    !/[a-zA-Z]/.test(values.password) ||
    !/[0-9]/.test(values.password)
  ) {
    errors.password =
      "Use a password of 10–128 characters with at least one letter and one number.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Your passwords do not match.";
  }

  if (!values.termsAccepted) {
    errors.termsAccepted = "Accept the terms to create an account.";
  }

  if (values.role === "admin") {
    if (!values.organizationName.trim()) {
      errors.organizationName = "Enter your organization name.";
    }
    if (!values.designation.trim()) {
      errors.designation = "Enter your designation.";
    }
  }

  if (values.role === "training_provider") {
    if (!values.organizationName.trim()) {
      errors.organizationName = "Enter your institute or company name.";
    }
    if (!values.specialization.trim()) {
      errors.specialization = "Enter your area of specialization.";
    }
  }

  return errors;
}

export function getRegistrationErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "We couldn’t reach Supabase. Check your connection and try again.";
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    const normalized = message.toLowerCase();

    if (
      normalized.includes("user already registered") ||
      normalized.includes("user already exists") ||
      normalized.includes("email already registered")
    ) {
      return "An account with this email already exists. Try logging in instead.";
    }

    if (normalized.includes("invalid email")) {
      return "Enter a valid email address.";
    }

    if (
      normalized.includes("password") &&
      (normalized.includes("least") ||
        normalized.includes("weak") ||
        normalized.includes("characters"))
    ) {
      return "Choose a stronger password that meets the password requirements.";
    }

    if (
      normalized.includes("rate limit") ||
      normalized.includes("too many requests")
    ) {
      return "Too many attempts were made. Wait a little and try again.";
    }

    if (
      normalized.includes("fetch") ||
      normalized.includes("network") ||
      normalized.includes("failed to connect")
    ) {
      return "We couldn’t reach Supabase. Check your connection and try again.";
    }
  }

  return "We couldn’t create your account. Please try again in a moment.";
}

export type RegistrationMetadata = {
  full_name: string;
  terms_accepted: true;
  account_type: RegistrationRole;
  sector?: OrganizationSector;
  location?: string;
  organization_name?: string;
  designation?: string;
  specialization?: string;
};

export function getRegistrationMetadata(
  values: RegistrationValues,
): RegistrationMetadata | null {
  const role = values.role;
  const sector = values.sector;
  if (!role) return null;

  const metadata: RegistrationMetadata = {
    full_name: values.fullName.trim(),
    terms_accepted: true,
    account_type: role,
  };

  if (role === "admin" || role === "training_provider") {
    if (sector !== "government" && sector !== "private") return null;
    metadata.sector = sector;
  }

  if (role === "job_seeker" && values.location.trim()) {
    metadata.location = values.location.trim();
  }

  if (role === "admin" || role === "training_provider") {
    metadata.organization_name = values.organizationName.trim();
  }

  if (role === "admin") {
    metadata.designation = values.designation.trim();
  }

  if (role === "training_provider") {
    metadata.specialization = values.specialization.trim();
  }

  return metadata;
}
