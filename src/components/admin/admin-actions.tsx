"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  closeAdminJobAction,
  markAdminNotificationReadAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CloseJobForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    closeAdminJobAction,
    {},
  );

  return (
    <div className="space-y-2">
      <form action={action}>
        <input name="job_id" type="hidden" value={jobId} />
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            "Close job"
          )}
        </Button>
      </form>
      {state.error ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function MarkAdminNotificationRead({
  notificationId,
}: {
  notificationId: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    markAdminNotificationReadAction,
    {},
  );

  return (
    <div className="space-y-2">
      <form action={action}>
        <input
          name="notification_id"
          type="hidden"
          value={notificationId}
        />
        <Button disabled={pending} size="sm" type="submit" variant="outline">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            "Mark read"
          )}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
