"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  reviewAdminAccessRequestAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AccessRequestReviewForm({
  requestId,
}: {
  requestId: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    reviewAdminAccessRequestAction,
    {},
  );

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap gap-2">
        <input name="request_id" type="hidden" value={requestId} />
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="approve"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Approve admin access
        </Button>
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="reject"
          variant="outline"
        >
          Reject request
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
