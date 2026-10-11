"use client";

import { useActionState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

import {
  recordCourseInterestAction,
  type SeekerActionState,
  visitCourseAction,
} from "@/app/seeker/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CourseActions({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState<
    SeekerActionState,
    FormData
  >(recordCourseInterestAction, {});

  return (
    <div className="flex flex-wrap gap-3">
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <form action={visitCourseAction}>
        <input name="course_id" type="hidden" value={courseId} />
        <Button className="gap-2" type="submit">
          <ExternalLink aria-hidden="true" className="size-4" />
          Visit provider course page
        </Button>
      </form>
      <form action={formAction}>
        <input name="course_id" type="hidden" value={courseId} />
        <Button disabled={pending} type="submit" variant="outline">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Track my interest
        </Button>
      </form>
    </div>
  );
}
