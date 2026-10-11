import type { Metadata } from "next";
import { Search } from "lucide-react";

import { CourseCard } from "@/components/seeker/course-card";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrganizations, getPublishedCourses } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Courses" };

type SearchParams = Promise<{
  search?: string;
  mode?: string;
  skill?: string;
  error?: string;
}>;

export default async function SeekerCoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const [allCourses, savedRows] = await Promise.all([
      getPublishedCourses(supabase, params.search),
      supabase
        .from("saved_courses")
        .select("course_id")
        .eq("candidate_id", user.id),
  ]);
  if (savedRows.error) throw savedRows.error;

  const courses = allCourses.filter((course) => {
      if (params.mode && course.delivery_mode !== params.mode) return false;
      if (
        params.skill &&
        !course.skills_taught.some(
          (skill) => skill.toLocaleLowerCase() === params.skill?.toLocaleLowerCase(),
        )
      ) {
        return false;
      }
      return true;
  });
  const savedIds = new Set(
      (savedRows.data ?? []).map((item) => item.course_id),
  );
  const organizations = await getOrganizations(
      supabase,
      courses.map((course) => course.organization_id),
  );

  return (
      <SeekerPage
        eyebrow="Learn and grow"
        title="Published courses"
        description="Browse training opportunities provided by organizations."
      >
        {params.error === "course_unavailable" ? (
          <Alert variant="destructive">
            <AlertTitle>Course link is unavailable</AlertTitle>
            <AlertDescription>
              We couldn’t record the course visit or load the provider page.
              Please try again later.
            </AlertDescription>
          </Alert>
        ) : null}
        <form
          className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
          method="get"
          role="search"
        >
          <label className="space-y-1 text-xs font-medium" htmlFor="course-search">
            Course title
            <Input
              className="bg-background"
              defaultValue={params.search}
              id="course-search"
              maxLength={200}
              name="search"
              placeholder="Search course titles"
            />
          </label>
          <label className="space-y-1 text-xs font-medium" htmlFor="course-skill">
            Skill taught
            <Input
              className="bg-background"
              defaultValue={params.skill}
              id="course-skill"
              maxLength={120}
              name="skill"
              placeholder="Exact skill"
            />
          </label>
          <label className="space-y-1 text-xs font-medium" htmlFor="course-mode">
            Delivery mode
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue={params.mode ?? ""}
              id="course-mode"
              name="mode"
            >
              <option value="">Any mode</option>
              <option value="online">Online</option>
              <option value="in_person">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <Button className="gap-2" type="submit">
            <Search aria-hidden="true" className="size-4" />
            Search courses
          </Button>
        </form>
        {courses.length ? (
          <div className="grid gap-3">
            {courses.map((course) => (
              <CourseCard
                course={course}
                key={course.id}
                organization={organizations.get(course.organization_id)}
                saved={savedIds.has(course.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published courses found"
            description="Try different filters, or check back when providers publish new courses."
          />
        )}
      </SeekerPage>
  );
}
