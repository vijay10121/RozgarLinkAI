"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateTrainerOrganizationAction,
  updateTrainerProfileAction,
  type TrainerActionState,
} from "@/app/trainer/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TrainerOrganization } from "@/lib/trainer/data";
import type { UserProfile } from "@/types/supabase";

export function TrainerPersonalProfileForm({
  profile,
  email,
}: {
  profile: UserProfile;
  email: string;
}) {
  const [state, action, pending] = useActionState<TrainerActionState, FormData>(
    updateTrainerProfileAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} label="Provider profile" />
      <Field label="Full name" id="trainer-name">
        <Input
          autoComplete="name"
          defaultValue={profile.display_name ?? ""}
          id="trainer-name"
          maxLength={120}
          name="display_name"
          required
        />
      </Field>
      <Field label="Account email" id="trainer-email">
        <Input disabled id="trainer-email" type="email" value={email} />
      </Field>
      <Field label="Specialization" id="trainer-specialization">
        <Input
          defaultValue={profile.specialization ?? ""}
          id="trainer-specialization"
          maxLength={160}
          name="specialization"
        />
      </Field>
      <Field label="Contact phone" id="trainer-phone">
        <Input
          autoComplete="tel"
          defaultValue={profile.phone ?? ""}
          id="trainer-phone"
          maxLength={40}
          name="phone"
        />
      </Field>
      <Button disabled={pending} type="submit">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        Save profile
      </Button>
    </form>
  );
}

export function TrainerOrganizationForm({
  organization,
}: {
  organization: TrainerOrganization;
}) {
  const [state, action, pending] = useActionState<TrainerActionState, FormData>(
    updateTrainerOrganizationAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <input name="organization_id" type="hidden" value={organization.id} />
      <Feedback state={state} label="Organization details" />
      <Field label="Institute or company name" id="trainer-org-name">
        <Input
          defaultValue={organization.name}
          id="trainer-org-name"
          maxLength={200}
          name="name"
          required
        />
      </Field>
      <Field label="Sector" id="trainer-org-sector">
        <Input
          disabled
          id="trainer-org-sector"
          value={
            organization.sector === "government" ? "Government" : "Private"
          }
        />
      </Field>
      <Field label="Organization description" id="trainer-org-description">
        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={organization.description}
          id="trainer-org-description"
          maxLength={4000}
          name="description"
        />
      </Field>
      <Field label="Contact email" id="trainer-org-email">
        <Input
          autoComplete="email"
          defaultValue={organization.contact_email ?? ""}
          id="trainer-org-email"
          maxLength={254}
          name="contact_email"
          type="email"
        />
      </Field>
      <Field label="Contact phone" id="trainer-org-phone">
        <Input
          autoComplete="tel"
          defaultValue={organization.contact_phone ?? ""}
          id="trainer-org-phone"
          maxLength={40}
          name="contact_phone"
        />
      </Field>
      <div className="space-y-1 text-sm">
        <p className="font-medium">Organization verification</p>
        <p className="text-muted-foreground">
          {organization.is_verified
            ? "Verified by RozgarLink."
            : "Not verified. Only an authorized platform reviewer can verify your organization."}
        </p>
      </div>
      <Button disabled={pending} type="submit">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        Save organization
      </Button>
    </form>
  );
}

function Feedback({
  state,
  label,
}: {
  state: TrainerActionState;
  label: string;
}) {
  return (
    <>
      {state.error ? (
        <Alert role="alert" variant="destructive">
          <AlertTitle>{label} not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
    </>
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
