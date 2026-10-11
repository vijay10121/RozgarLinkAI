"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  getRegistrationErrorMessage,
  getRegistrationMetadata,
  initialRegistrationValues,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationRole,
  type RegistrationValues,
} from "@/lib/registration";
import { cn } from "@/lib/utils";
import type { OrganizationSector } from "@/types/supabase";

const accountTypes: {
  value: RegistrationRole;
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}[] = [
  {
    value: "job_seeker",
    title: "Job seeker",
    description: "Find work and learning opportunities",
    icon: BriefcaseBusiness,
  },
  {
    value: "admin",
    title: "Admin",
    description: "Request access for an organization",
    icon: ShieldCheck,
  },
  {
    value: "training_provider",
    title: "Training provider",
    description: "Share your institute’s training programs",
    icon: GraduationCap,
  },
];

const sectors: { value: OrganizationSector; title: string; detail: string }[] =
  [
    {
      value: "government",
      title: "Government",
      detail: "Public-sector organization",
    },
    {
      value: "private",
      title: "Private",
      detail: "Private-sector organization",
    },
  ];

function Field({
  id,
  label,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        className="flex items-center justify-between gap-3 text-sm font-medium text-foreground"
        htmlFor={id}
      >
        <span>{label}</span>
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">
            Optional
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p
          aria-live="polite"
          className="text-sm text-destructive"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const [values, setValues] = useState<RegistrationValues>(
    initialRegistrationValues,
  );
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  function update<K extends keyof RegistrationValues>(
    field: K,
    value: RegistrationValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError("");
  }

  function selectRole(role: RegistrationRole) {
    setValues((current) => ({
      ...current,
      role,
      sector: role === "job_seeker" ? "" : current.sector,
    }));
    setErrors({});
    setRequestError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setRequestError("");

    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const role = values.role;
    const metadata = getRegistrationMetadata(values);
    if (!role || !metadata) {
      setRequestError("Choose a valid account type and sector to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        setRequestError(getRegistrationErrorMessage(error));
        return;
      }

      if (!data.user) {
        setRequestError(
          "Supabase did not create an account. Please try again.",
        );
        return;
      }

      if (data.user.identities?.length === 0) {
        setRequestError(
          "An account may already exist for this email. Try logging in or use another email address.",
        );
        return;
      }

      if (!data.session) {
        setRequestError(
          "The account was created, but Supabase is still requiring email confirmation. Ask the project owner to turn off Confirm email in Supabase Auth settings before trying again.",
        );
        return;
      }

      setSuccess(
        role === "admin"
          ? "Your admin access request has been submitted. Your account will remain a job-seeker account until an existing administrator approves it."
          : role === "training_provider"
            ? "Your training-provider account has been created."
            : "Your job-seeker account has been created.",
      );
    } catch (error) {
      setRequestError(getRegistrationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div aria-live="polite" className="space-y-6" role="status">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Check aria-hidden="true" className="size-7" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
            You’re on your way
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
            Account created
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            {success}
          </p>
        </div>
        <Link
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          href="/login"
        >
          Continue to log in
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-8" noValidate onSubmit={handleSubmit}>
      {requestError ? (
        <Alert variant="destructive">
          <AlertTitle>We couldn’t finish registration</AlertTitle>
          <AlertDescription>{requestError}</AlertDescription>
        </Alert>
      ) : null}

      <fieldset
        aria-describedby={errors.role ? "role-error" : undefined}
        aria-invalid={Boolean(errors.role)}
        className="space-y-3"
      >
        <legend
          className="mb-3 text-sm font-semibold text-foreground"
        >
          1. Choose an account type
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {accountTypes.map(({ value, title, description, icon: Icon }) => {
            const selected = values.role === value;
            return (
              <label
                className={cn(
                  "group relative flex min-h-32 cursor-pointer flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-brand/50 hover:shadow-md has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                  selected
                    ? "border-brand bg-brand-soft/50 ring-2 ring-brand/15"
                    : "border-border",
                )}
                key={value}
              >
                <input
                  aria-label={title}
                  aria-describedby={[
                    errors.role ? "role-error" : "",
                    value === "admin" ? "admin-request-note" : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined}
                  checked={selected}
                  className="peer sr-only"
                  name="accountType"
                  onChange={() => selectRole(value)}
                  type="radio"
                  value={value}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mb-3 flex size-9 items-center justify-center rounded-lg",
                    selected
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {title}
                </span>
                <span className="mt-1 text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground"
                  >
                    <Check className="size-3" />
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
        {errors.role ? (
          <p
            aria-live="polite"
            className="text-sm text-destructive"
            id="role-error"
            role="alert"
          >
            {errors.role}
          </p>
        ) : null}
        {values.role === "admin" ? (
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
            id="admin-request-note"
          >
            Admin access requires approval. Registration submits a request;
            administrator privileges are not granted until an existing admin
            approves it.
          </p>
        ) : null}
      </fieldset>

      {values.role ? (
        <>
          {(values.role === "admin" ||
            values.role === "training_provider") && (
            <fieldset
              aria-describedby={errors.sector ? "sector-error" : undefined}
              aria-invalid={Boolean(errors.sector)}
              className="space-y-3"
            >
              <legend
                className="mb-3 text-sm font-semibold text-foreground"
              >
                2. Select your sector
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {sectors.map(({ value, title, detail }) => {
                  const selected = values.sector === value;
                  return (
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:border-brand/50 has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                        selected
                          ? "border-brand bg-brand-soft/50 ring-2 ring-brand/15"
                          : "border-border",
                      )}
                      key={value}
                    >
                      <input
                        aria-label={title}
                        aria-describedby={
                          errors.sector ? "sector-error" : undefined
                        }
                        checked={selected}
                        className="size-4 accent-[var(--brand)]"
                        name="sector"
                        onChange={() => update("sector", value)}
                        type="radio"
                        value={value}
                      />
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Building2 aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {detail}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.sector ? (
                <p
                  aria-live="polite"
                  className="text-sm text-destructive"
                  id="sector-error"
                  role="alert"
                >
                  {errors.sector}
                </p>
              ) : null}
            </fieldset>
          )}

          <fieldset className="space-y-5">
            <legend className="mb-4 text-sm font-semibold text-foreground">
              {values.role === "job_seeker"
                ? "2. Your details"
                : "3. Your details"}
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div
                className={
                  values.role === "job_seeker" ? "sm:col-span-2" : ""
                }
              >
                <Field error={errors.fullName} id="fullName" label="Full name">
                  <Input
                    autoComplete="name"
                    aria-describedby={
                      errors.fullName ? "fullName-error" : undefined
                    }
                    aria-invalid={Boolean(errors.fullName)}
                    autoCapitalize="words"
                    className="h-11 bg-background"
                    id="fullName"
                    maxLength={120}
                    name="fullName"
                    onChange={(event) =>
                      update("fullName", event.target.value)
                    }
                    placeholder="Your full name"
                    value={values.fullName}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field error={errors.email} id="email" label="Email address">
                  <Input
                    autoComplete="email"
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-invalid={Boolean(errors.email)}
                    className="h-11 bg-background"
                    id="email"
                    inputMode="email"
                    maxLength={254}
                    name="email"
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={values.email}
                  />
                </Field>
              </div>

              <Field
                error={errors.password}
                id="password"
                label="Password"
              >
                <div className="relative">
                  <Input
                    autoComplete="new-password"
                    aria-describedby={
                      errors.password ? "password-error" : "password-hint"
                    }
                    aria-invalid={Boolean(errors.password)}
                    className="h-11 bg-background pr-12"
                    id="password"
                    maxLength={128}
                    minLength={10}
                    name="password"
                    onChange={(event) =>
                      update("password", event.target.value)
                    }
                    placeholder="At least 10 characters"
                    type={showPasswords ? "text" : "password"}
                    value={values.password}
                  />
                  <button
                    aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    aria-pressed={showPasswords}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    type="button"
                  >
                    {showPasswords ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
                <p
                  className="text-xs leading-5 text-muted-foreground"
                  id="password-hint"
                >
                  Use 10–128 characters with a letter and a number.
                </p>
              </Field>

              <Field
                error={errors.confirmPassword}
                id="confirmPassword"
                label="Confirm password"
              >
                <Input
                  autoComplete="new-password"
                  aria-describedby={
                    errors.confirmPassword
                      ? "confirmPassword-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className="h-11 bg-background"
                  id="confirmPassword"
                  maxLength={128}
                  name="confirmPassword"
                  onChange={(event) =>
                    update("confirmPassword", event.target.value)
                  }
                  placeholder="Enter your password again"
                  type={showPasswords ? "text" : "password"}
                  value={values.confirmPassword}
                />
              </Field>

              {values.role === "job_seeker" ? (
                <div className="sm:col-span-2">
                  <Field
                    id="location"
                    label="Initial location"
                    optional
                  >
                    <Input
                      autoComplete="address-level2"
                      className="h-11 bg-background"
                      id="location"
                      maxLength={160}
                      name="location"
                      onChange={(event) =>
                        update("location", event.target.value)
                      }
                      placeholder="City or region"
                      value={values.location}
                    />
                  </Field>
                </div>
              ) : null}

              {values.role === "admin" ? (
                <>
                  <div className="sm:col-span-2">
                    <Field
                      error={errors.organizationName}
                      id="organizationName"
                      label="Organization name"
                    >
                      <Input
                        autoComplete="organization"
                        aria-describedby={
                          errors.organizationName
                            ? "organizationName-error"
                            : undefined
                        }
                        aria-invalid={Boolean(errors.organizationName)}
                        className="h-11 bg-background"
                        id="organizationName"
                        maxLength={200}
                        name="organizationName"
                        onChange={(event) =>
                          update("organizationName", event.target.value)
                        }
                        placeholder="Your organization"
                        value={values.organizationName}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      error={errors.designation}
                      id="designation"
                      label="Designation"
                    >
                      <Input
                        aria-describedby={
                          errors.designation ? "designation-error" : undefined
                        }
                        aria-invalid={Boolean(errors.designation)}
                        autoComplete="organization-title"
                        className="h-11 bg-background"
                        id="designation"
                        maxLength={120}
                        name="designation"
                        onChange={(event) =>
                          update("designation", event.target.value)
                        }
                        placeholder="Your role or title"
                        value={values.designation}
                      />
                    </Field>
                  </div>
                </>
              ) : null}

              {values.role === "training_provider" ? (
                <>
                  <div className="sm:col-span-2">
                    <Field
                      error={errors.organizationName}
                      id="organizationName"
                      label="Institute or company name"
                    >
                      <Input
                        autoComplete="organization"
                        aria-describedby={
                          errors.organizationName
                            ? "organizationName-error"
                            : undefined
                        }
                        aria-invalid={Boolean(errors.organizationName)}
                        className="h-11 bg-background"
                        id="organizationName"
                        maxLength={200}
                        name="organizationName"
                        onChange={(event) =>
                          update("organizationName", event.target.value)
                        }
                        placeholder="Your institute or company"
                        value={values.organizationName}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      error={errors.specialization}
                      id="specialization"
                      label="Area of specialization"
                    >
                      <Input
                        aria-describedby={
                          errors.specialization
                            ? "specialization-error"
                            : undefined
                        }
                        aria-invalid={Boolean(errors.specialization)}
                        className="h-11 bg-background"
                        id="specialization"
                        maxLength={160}
                        name="specialization"
                        onChange={(event) =>
                          update("specialization", event.target.value)
                        }
                        placeholder="For example, digital skills"
                        value={values.specialization}
                      />
                    </Field>
                  </div>
                </>
              ) : null}
            </div>
          </fieldset>

          <div className="space-y-5">
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  aria-describedby={
                    errors.termsAccepted ? "termsAccepted-error" : undefined
                  }
                  aria-invalid={Boolean(errors.termsAccepted)}
                  checked={values.termsAccepted}
                  className="mt-1 size-4 shrink-0 accent-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  name="termsAccepted"
                  onChange={(event) =>
                    update("termsAccepted", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  I agree to the terms of service and acknowledge the privacy
                  notice.
                </span>
              </label>
              {errors.termsAccepted ? (
                <p
                  className="mt-2 text-sm text-destructive"
                  id="termsAccepted-error"
                  role="alert"
                >
                  {errors.termsAccepted}
                </p>
              ) : null}
            </div>

            <Button
              className="h-12 w-full gap-2 text-base"
              disabled={isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Creating your account…
                </>
              ) : (
                <>
                  {values.role === "admin"
                    ? "Create account & request admin access"
                    : "Create account"}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="/login"
              >
                Log in
              </Link>
            </p>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          <UsersRound
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          Choose the account type that best describes you to see the right
          registration details.
        </div>
      )}
    </form>
  );
}
