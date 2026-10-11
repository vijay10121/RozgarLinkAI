"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateSeekerProfileAction,
  type SeekerActionState,
} from "@/app/seeker/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SeekerProfile } from "@/lib/seeker/data";

function asText(value: string[] | null | undefined): string {
  return value?.join(", ") ?? "";
}

export function ProfileForm({ profile }: { profile: SeekerProfile }) {
  const [state, formAction, pending] = useActionState<
    SeekerActionState,
    FormData
  >(updateSeekerProfileAction, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.success ? (
        <Alert>
          <AlertTitle>Profile saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Profile not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" id="profile-display-name">
          <Input
            autoComplete="name"
            className="bg-background"
            defaultValue={profile.display_name ?? ""}
            id="profile-display-name"
            maxLength={120}
            name="display_name"
          />
        </Field>
        <Field label="Location" id="profile-location">
          <Input
            autoComplete="address-level2"
            className="bg-background"
            defaultValue={profile.location ?? ""}
            id="profile-location"
            maxLength={200}
            name="location"
          />
        </Field>
        <Field label="Education" id="profile-education">
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={profile.education ?? ""}
            id="profile-education"
            maxLength={2000}
            name="education"
          />
        </Field>
        <Field label="Experience (years)" id="profile-experience">
          <Input
            className="bg-background"
            defaultValue={profile.experience_years ?? ""}
            id="profile-experience"
            max={80}
            min={0}
            name="experience_years"
            step="0.5"
            type="number"
          />
        </Field>
        <ListField
          label="Qualifications"
          id="profile-qualifications"
          name="qualifications"
          value={asText(profile.qualifications)}
          hint="Separate entries with commas or new lines."
        />
        <ListField
          label="Skills"
          id="profile-skills"
          name="skills"
          value={asText(profile.skills)}
          hint="Duplicate skills are removed when you save."
        />
        <ListField
          label="Preferred roles"
          id="profile-preferred-roles"
          name="preferred_roles"
          value={asText(profile.preferred_roles)}
          hint="Separate entries with commas or new lines."
        />
        <ListField
          label="Preferred locations"
          id="profile-preferred-locations"
          name="preferred_locations"
          value={asText(profile.preferred_locations)}
          hint="Separate entries with commas or new lines."
        />
        <div className="flex items-start gap-3 sm:col-span-2">
          <input
            className="mt-1 size-4 accent-brand"
            defaultChecked={profile.job_alerts_enabled}
            id="profile-job-alerts"
            name="job_alerts_enabled"
            type="checkbox"
          />
          <div>
            <label
              className="text-sm font-medium"
              htmlFor="profile-job-alerts"
            >
              In-app alerts for matching published jobs
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              We’ll add an in-app notification when a new job matches your
              saved role, location, or skill preferences.
            </p>
          </div>
        </div>
      </div>
      <Button className="gap-2" disabled={pending} type="submit">
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Saving profile…
          </>
        ) : (
          "Save profile"
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ListField({
  label,
  id,
  name,
  value,
  hint,
}: {
  label: string;
  id: string;
  name: string;
  value: string;
  hint: string;
}) {
  return (
    <Field id={id} label={label}>
      <textarea
        aria-describedby={`${id}-hint`}
        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={value}
        id={id}
        maxLength={6000}
        name={name}
      />
      <p className="text-xs text-muted-foreground" id={`${id}-hint`}>
        {hint}
      </p>
    </Field>
  );
}
