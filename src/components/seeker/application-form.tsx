"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  applyToJobAction,
  type SeekerActionState,
} from "@/app/seeker/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ApplicationForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState<
    SeekerActionState,
    FormData
  >(applyToJobAction, {});

  return (
    <div className="space-y-3">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Application not submitted</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertTitle>Application submitted</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      <form action={formAction}>
        <input name="job_id" type="hidden" value={jobId} />
        <Button className="gap-2" disabled={pending} type="submit">
          {pending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Verifying and submitting…
            </>
          ) : (
            "Apply for this job"
          )}
        </Button>
      </form>
    </div>
  );
}
