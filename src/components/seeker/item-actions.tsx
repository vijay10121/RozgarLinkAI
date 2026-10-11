"use client";

import { useActionState } from "react";
import { Bookmark, LoaderCircle } from "lucide-react";

import {
  toggleSavedCourseAction,
  toggleSavedJobAction,
  type SeekerActionState,
} from "@/app/seeker/actions";
import { Button } from "@/components/ui/button";

export function SaveJobButton({
  jobId,
  saved,
}: {
  jobId: string;
  saved: boolean;
}) {
  const action = async (_state: SeekerActionState, formData: FormData) =>
    toggleSavedJobAction(_state, formData);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-1">
      <input name="job_id" type="hidden" value={jobId} />
      <Button
        aria-label={saved ? "Remove job from saved jobs" : "Save job"}
        disabled={pending}
        size="sm"
        type="submit"
        variant="outline"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Bookmark aria-hidden="true" className="size-4" />
        )}
        <span>{saved ? "Saved" : "Save"}</span>
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SaveCourseButton({
  courseId,
  saved,
}: {
  courseId: string;
  saved: boolean;
}) {
  const action = async (_state: SeekerActionState, formData: FormData) =>
    toggleSavedCourseAction(_state, formData);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-1">
      <input name="course_id" type="hidden" value={courseId} />
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Bookmark aria-hidden="true" className="size-4" />
        )}
        {saved ? "Saved" : "Save course"}
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
