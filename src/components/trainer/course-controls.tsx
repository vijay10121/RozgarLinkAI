"use client";

import { useActionState } from "react";
import { Archive, LoaderCircle } from "lucide-react";

import {
  archiveTrainerCourseAction,
  type TrainerActionState,
} from "@/app/trainer/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ArchiveCourseForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState<TrainerActionState, FormData>(
    archiveTrainerCourseAction,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <input name="course_id" type="hidden" value={courseId} />
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
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Archive aria-hidden="true" />
        )}
        Archive course
      </Button>
    </form>
  );
}
