import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseActions } from "@/components/seeker/course-actions";
import { SaveCourseButton } from "@/components/seeker/item-actions";
import { RetryButton } from "@/components/seeker/retry-button";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course details" };

export default async function SeekerCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return (
      <SeekerPage title="Course details">
        <Alert variant="destructive">
          <AlertTitle>Course details couldn’t be loaded</AlertTitle>
          <AlertDescription>Try again in a moment.</AlertDescription>
        </Alert>
        <RetryButton />
      </SeekerPage>
    );
  }
  if (!course) notFound();

  const [{ data: organization }, { data: saved }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", course.organization_id)
      .maybeSingle(),
    supabase
      .from("saved_courses")
      .select("course_id")
      .eq("candidate_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  return (
    <SeekerPage
      eyebrow="Course details"
      title={course.title}
      description={`${organization?.name ?? "Training provider"} · ${course.delivery_mode.replaceAll("_", " ")}${course.duration ? ` · ${course.duration}` : ""}`}
      actions={
        <SaveCourseButton courseId={course.id} saved={Boolean(saved)} />
      }
    >
      <Card>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <section>
            <h2 className="font-heading text-lg font-semibold">About this course</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {course.description}
            </p>
          </section>
          {course.skills_taught.length ? (
            <section>
              <h2 className="font-heading text-lg font-semibold">
                Skills taught
              </h2>
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The course provider manages the course page and any enrollment
              process. Visiting the link or tracking your interest does not
              enroll you.
            </p>
            <CourseActions courseId={course.id} />
          </div>
        </CardContent>
      </Card>
    </SeekerPage>
  );
}
