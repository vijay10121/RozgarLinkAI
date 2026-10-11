"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  markTrainerNotificationReadAction,
  type TrainerActionState,
} from "@/app/trainer/actions";
import { Button } from "@/components/ui/button";

export function TrainerNotificationReadForm({
  notificationId,
}: {
  notificationId: string;
}) {
  const [, action, pending] = useActionState<TrainerActionState, FormData>(
    markTrainerNotificationReadAction,
    {},
  );
  return (
    <form action={action}>
      <input name="notification_id" type="hidden" value={notificationId} />
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        Mark read
      </Button>
    </form>
  );
}
