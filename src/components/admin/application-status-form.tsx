"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import {
  updateAdminApplicationStatusAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AdminApplicationStatus } from "@/lib/admin/validation";

const labels: Record<AdminApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  selected: "Selected",
  withdrawn: "Withdrawn",
};

export function ApplicationStatusForm({
  applicationId,
  currentStatus,
  options,
}: {
  applicationId: string;
  currentStatus: AdminApplicationStatus;
  options: AdminApplicationStatus[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updateAdminApplicationStatusAction,
    {},
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input name="application_id" type="hidden" value={applicationId} />
        <label className="sr-only" htmlFor={`status-${applicationId}`}>
          Change status
        </label>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
          disabled={pending || options.length === 0}
          id={`status-${applicationId}`}
          name="status"
          required
        >
          <option disabled value="">
            {options.length ? "Change status" : labels[currentStatus]}
          </option>
          {options.map((status) => (
            <option key={status} value={status}>
              {labels[status]}
            </option>
          ))}
        </select>
        <Button disabled={pending || options.length === 0} type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            "Update"
          )}
        </Button>
      </form>
      {state.error ? (
        <Alert className="max-w-sm" variant="destructive" role="alert">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert className="max-w-sm">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
