import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ExternalLink, Pencil } from "lucide-react";

import { ArchiveCourseForm } from "@/components/trainer/course-controls";
import { TrainerPage } from "@/components/trainer/trainer-page";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { getTrainerOrganization } from "@/lib/trainer/data";
import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";

export const metadata: Metadata = { title: "Course details" };

export default function TrainerCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading course details" />}>
      <TrainerCourseDetailContent params={params} />
    </Suspense>
  );
}

async function TrainerCourseDetailContent({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await connection();
  const { courseId } = await params;
  const { supabase, user, profile } = await requireRole("training_provider");
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("owner_provider_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingMarketplaceSchemaError(error)) {
      return (
        <TrainerPage title="Course details">
          <MarketplaceSchemaNotice />
        </TrainerPage>
      );
    }
    throw new Error("Unable to load this course.", { cause: error });
  }
  if (!course) notFound();

  const organization = profile.sector
    ? await getTrainerOrganization(supabase, user.id, profile.sector)
    : null;
  const imageUrl = course.image_path
    ? supabase.storage
        .from("training-course-images")
        .getPublicUrl(course.image_path).data.publicUrl
    : null;

  return (
    <TrainerPage
      eyebrow={organization?.name ?? "Your organization"}
      title={course.title}
      description={`${course.specialization} · ${course.difficulty_level} · ${course.delivery_mode.replaceAll("_", " ")}${course.duration ? ` · ${course.duration}` : ""}`}
      actions={
        course.status !== "closed" ? (
          <Button
            render={<Link href={`/trainer/courses/${course.id}/edit`} />}
            variant="outline"
          >
            <Pencil aria-hidden="true" />
            Edit course
          </Button>
        ) : null
      }
    >
      <Card>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold capitalize text-brand">
              {course.status === "closed" ? "archived" : course.status}
            </span>
            {course.status === "published" ? (
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                href={`/seeker/courses/${course.id}`}
              >
                View published listing
              </Link>
            ) : null}
          </div>
          {imageUrl ? (
            <a
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand underline"
              href={imageUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              View course image
            </a>
          ) : null}
          <section>
            <h2 className="font-heading text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {course.description}
            </p>
          </section>
          {course.skills_taught.length ? (
            <section>
              <h2 className="font-heading text-lg font-semibold">Skills taught</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {course.skills_taught.map((skill) => (
                  <li
                    className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand"
                    key={skill}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <a
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
            href={course.course_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            External enrollment page
          </a>
          {course.status !== "closed" ? (
            <div className="border-t border-border pt-5">
              <ArchiveCourseForm courseId={course.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </TrainerPage>
  );
}
