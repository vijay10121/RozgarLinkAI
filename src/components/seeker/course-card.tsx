import Link from "next/link";

import { SaveCourseButton } from "@/components/seeker/item-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { Course, OrganizationSummary } from "@/lib/seeker/data";

export function CourseCard({
  course,
  organization,
  saved,
}: {
  course: Course;
  organization?: OrganizationSummary;
  saved: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            className="rounded-sm font-heading text-lg font-semibold text-foreground underline-offset-4 hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/seeker/courses/${course.id}`}
          >
            {course.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization?.name ?? "Provider details unavailable"} ·{" "}
            {course.delivery_mode.replaceAll("_", " ")}
            {course.duration ? ` · ${course.duration}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {course.skills_taught.map((skill) => (
              <span
                className="rounded-full border border-border px-2.5 py-1 text-muted-foreground"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <SaveCourseButton courseId={course.id} saved={saved} />
      </CardContent>
    </Card>
  );
}
