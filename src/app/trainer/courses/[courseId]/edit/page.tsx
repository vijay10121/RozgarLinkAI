import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

import { TrainerCourseForm } from "@/components/trainer/course-form";
import { TrainerPage } from "@/components/trainer/trainer-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState } from "@/components/states/loading-state";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";

export const metadata: Metadata = { title: "Edit course" };

export default function EditTrainerCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading course editor" />}>
      <EditTrainerCourseContent params={params} />
    </Suspense>
  );
}

async function EditTrainerCourseContent({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await connection();
  const { courseId } = await params;
  const { supabase, user } = await requireRole("training_provider");
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("owner_provider_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingMarketplaceSchemaError(error)) {
      return (
        <TrainerPage title="Edit course">
          <MarketplaceSchemaNotice />
        </TrainerPage>
      );
    }
    throw new Error("Unable to load this course for editing.", { cause: error });
  }
  if (!course) notFound();
  if (course.status === "closed") {
    return (
      <TrainerPage title="Edit course">
        <Alert variant="destructive">
          <AlertTitle>Archived course</AlertTitle>
          <AlertDescription>
            Archived courses are read-only and cannot be republished.
          </AlertDescription>
        </Alert>
      </TrainerPage>
    );
  }

  return (
    <TrainerPage
      eyebrow="Course catalogue"
      title="Edit course"
      description="Update course details or publish your changes."
    >
      <TrainerCourseForm course={course} />
    </TrainerPage>
  );
}
