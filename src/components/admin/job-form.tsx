"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import {
  saveAdminJobAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminJob, AdminOrganization } from "@/lib/admin/data";

export function AdminJobForm({
  job,
  organizations,
}: {
  job?: AdminJob;
  organizations: AdminOrganization[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    saveAdminJobAction,
    {},
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  return (
    <form action={action} className="space-y-6">
      {job ? <input name="job_id" type="hidden" value={job.id} /> : null}
      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Job not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="Job title" id="job-title">
          <Input
            autoComplete="off"
            className="bg-background"
            defaultValue={job?.title ?? ""}
            id="job-title"
            maxLength={200}
            name="title"
            required
          />
        </Field>
        <Field label="Organization" id="job-organization">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.organization_id ?? ""}
            id="job-organization"
            name="organization_id"
            required
          >
            <option disabled value="">
              Select your organization
            </option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location" id="job-location">
          <Input
            className="bg-background"
            defaultValue={job?.location ?? ""}
            id="job-location"
            maxLength={200}
            name="location"
            required
          />
        </Field>
        <Field label="Employment type" id="job-employment-type">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.employment_type ?? "full_time"}
            id="job-employment-type"
            name="employment_type"
            required
          >
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </Field>
        <Field label="Application deadline (optional)" id="job-deadline">
          <Input
            className="bg-background"
            defaultValue={job?.application_deadline ?? ""}
            id="job-deadline"
            name="application_deadline"
            type="date"
          />
        </Field>
        <Field label="Minimum experience (years)" id="job-experience">
          <Input
            className="bg-background"
            defaultValue={job?.min_experience_years ?? 0}
            id="job-experience"
            max={80}
            min={0}
            name="min_experience_years"
            step="0.5"
            type="number"
          />
        </Field>
        <Field label="Mandatory education (optional)" id="job-education">
          <Input
            className="bg-background"
            defaultValue={job?.mandatory_education ?? ""}
            id="job-education"
            maxLength={200}
            name="mandatory_education"
          />
        </Field>
        <Field
          label="Required qualifications (comma or newline separated)"
          id="job-qualifications"
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.required_qualifications.join(", ") ?? ""}
            id="job-qualifications"
            maxLength={6000}
            name="required_qualifications"
          />
        </Field>
        <Field
          label="Location restrictions (comma or newline separated)"
          id="job-location-restrictions"
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.location_restrictions.join(", ") ?? ""}
            id="job-location-restrictions"
            maxLength={6000}
            name="location_restrictions"
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Job description"
          id="job-description"
        >
          <textarea
            className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.description ?? ""}
            id="job-description"
            maxLength={20000}
            name="description"
            required
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Additional requirements"
          id="job-requirements"
        >
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.requirements ?? ""}
            id="job-requirements"
            maxLength={20000}
            name="requirements"
          />
        </Field>
        <Field
          label="Required skills (comma or newline separated)"
          id="job-required-skills"
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.required_skills.join(", ") ?? ""}
            id="job-required-skills"
            maxLength={6000}
            name="required_skills"
          />
        </Field>
        <Field
          label="Preferred skills (comma or newline separated)"
          id="job-preferred-skills"
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.preferred_skills.join(", ") ?? ""}
            id="job-preferred-skills"
            maxLength={6000}
            name="preferred_skills"
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Application instructions"
          id="job-application-instructions"
        >
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={job?.application_instructions ?? ""}
            id="job-application-instructions"
            maxLength={4000}
            name="application_instructions"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        {job?.status !== "published" ? (
          <Button
            disabled={pending || organizations.length === 0}
            name="intent"
            type="submit"
            value="draft"
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            Save as draft
          </Button>
        ) : null}
        <Button
          disabled={pending || organizations.length === 0}
          name="intent"
          type="submit"
          value="publish"
          variant="secondary"
        >
          {job?.status === "published" ? "Save changes" : "Publish job"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
