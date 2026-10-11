"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateAdminOrganizationAction,
  updateAdminProfileAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminOrganization } from "@/lib/admin/data";
import type { UserProfile } from "@/types/supabase";

export function AdminPersonalProfileForm({
  profile,
  email,
}: {
  profile: UserProfile;
  email: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updateAdminProfileAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} title="Profile details" />
      <Field label="Full name" id="admin-display-name">
        <Input
          autoComplete="name"
          defaultValue={profile.display_name ?? ""}
          id="admin-display-name"
          maxLength={120}
          name="display_name"
        />
      </Field>
      <Field label="Account email" id="admin-email">
        <Input autoComplete="email" disabled id="admin-email" value={email} />
      </Field>
      <Field label="Designation" id="admin-designation">
        <Input
          defaultValue={profile.designation ?? ""}
          id="admin-designation"
          maxLength={120}
          name="designation"
        />
      </Field>
      <Field label="Contact phone" id="admin-phone">
        <Input
          autoComplete="tel"
          defaultValue={profile.phone ?? ""}
          id="admin-phone"
          maxLength={40}
          name="phone"
        />
      </Field>
      <Button disabled={pending} type="submit">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}

export function AdminOrganizationForm({
  organization,
}: {
  organization: AdminOrganization;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updateAdminOrganizationAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input name="organization_id" type="hidden" value={organization.id} />
      <Feedback state={state} title="Organization details" />
      <Field label="Organization name" id="organization-name">
        <Input
          defaultValue={organization.name}
          id="organization-name"
          maxLength={200}
          name="name"
          required
        />
      </Field>
      <Field label="Sector" id="organization-sector">
        <Input
          disabled
          id="organization-sector"
          value={
            organization.sector === "government"
              ? "Government"
              : "Private"
          }
        />
      </Field>
      <Field label="Contact email" id="organization-email">
        <Input
          autoComplete="email"
          defaultValue={organization.contact_email ?? ""}
          id="organization-email"
          maxLength={254}
          name="contact_email"
          type="email"
        />
      </Field>
      <Field label="Contact phone" id="organization-phone">
        <Input
          autoComplete="tel"
          defaultValue={organization.contact_phone ?? ""}
          id="organization-phone"
          maxLength={40}
          name="contact_phone"
        />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">Verification</p>
        <p className="text-sm text-muted-foreground">
          {organization.is_verified
            ? "Verified by RozgarLink."
            : "Not verified. Only an authorized reviewer can verify an organization."}
        </p>
      </div>
      <Button disabled={pending} type="submit">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        Save organization
      </Button>
    </form>
  );
}

function Feedback({
  state,
  title,
}: {
  state: AdminActionState;
  title: string;
}) {
  return (
    <>
      {state.error ? (
        <Alert role="alert" variant="destructive">
          <AlertTitle>{title} not saved</AlertTitle>
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
