import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { TrainerCourseForm } from "@/components/trainer/course-form";
import { TrainerPage } from "@/components/trainer/trainer-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState } from "@/components/states/loading-state";
import { requireRole } from "@/lib/supabase/auth";
import { getTrainerOrganization } from "@/lib/trainer/data";

export const metadata: Metadata = { title: "Create course" };

export default function NewTrainerCoursePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading course form" />}>
      <NewTrainerCourseContent />
    </Suspense>
  );
}

async function NewTrainerCourseContent() {
  await connection();
  const { supabase, user, profile } = await requireRole("training_provider");
  const organization = profile.sector
    ? await getTrainerOrganization(supabase, user.id, profile.sector)
    : null;

  return (
    <TrainerPage
      eyebrow="Course catalogue"
      title="Create a course"
      description="Save a private draft or publish this course to job seekers."
    >
      {organization ? (
        <>
          <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            Provider: <strong>{organization.name}</strong>
          </p>
          <TrainerCourseForm />
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Provider organization unavailable</AlertTitle>
          <AlertDescription>
            A course can be created only for the organization linked to your
            authenticated provider profile.
          </AlertDescription>
        </Alert>
      )}
    </TrainerPage>
  );
}
