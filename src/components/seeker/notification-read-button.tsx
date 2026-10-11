"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import {
  markNotificationReadAction,
  type SeekerActionState,
} from "@/app/seeker/actions";
import { Button } from "@/components/ui/button";

export function NotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const [state, formAction, pending] = useActionState<
    SeekerActionState,
    FormData
  >(markNotificationReadAction, {});

  return (
    <form action={formAction} className="space-y-1">
      <input name="notification_id" type="hidden" value={notificationId} />
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Check aria-hidden="true" className="size-4" />
        )}
        Mark as read
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
