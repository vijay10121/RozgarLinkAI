import type { Metadata } from "next";

import { CourseCard } from "@/components/seeker/course-card";
import { JobCard } from "@/components/seeker/job-card";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrganizations } from "@/lib/seeker/data";
import Link from "next/link";

export const metadata: Metadata = { title: "Saved opportunities" };

export default async function SavedItemsPage() {
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const [savedJobsResult, savedCoursesResult] = await Promise.all([
      supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("candidate_id", user.id),
      supabase
        .from("saved_courses")
        .select("course_id")
        .eq("candidate_id", user.id),
  ]);
  if (savedJobsResult.error) throw savedJobsResult.error;
  if (savedCoursesResult.error) throw savedCoursesResult.error;

  const jobIds = (savedJobsResult.data ?? []).map((item) => item.job_id);
  const courseIds = (savedCoursesResult.data ?? []).map(
      (item) => item.course_id,
  );
  const [jobsResult, coursesResult] = await Promise.all([
      jobIds.length
        ? supabase
            .from("jobs")
            .select("*")
            .in("id", jobIds)
            .eq("status", "published")
        : Promise.resolve({ data: [], error: null }),
      courseIds.length
        ? supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)
            .eq("status", "published")
        : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobsResult.error) throw jobsResult.error;
  if (coursesResult.error) throw coursesResult.error;

  const organizations = await getOrganizations(supabase, [
      ...(jobsResult.data ?? []).map((job) => job.organization_id),
      ...(coursesResult.data ?? []).map((course) => course.organization_id),
  ]);
  const savedJobIds = new Set(jobIds);
  const savedCourseIds = new Set(courseIds);

  return (
      <SeekerPage
        eyebrow="Your collection"
        title="Saved opportunities"
        description="Jobs and courses you’ve saved for later."
      >
        {(jobsResult.data?.length ?? 0) + (coursesResult.data?.length ?? 0) ? (
          <div className="space-y-8">
            <section className="space-y-3" aria-labelledby="saved-jobs-title">
              <h2 className="font-heading text-lg font-semibold" id="saved-jobs-title">
                Saved jobs
              </h2>
              {jobsResult.data?.length ? (
                jobsResult.data.map((job) => (
                  <JobCard
                    job={job}
                    key={job.id}
                    organization={organizations.get(job.organization_id)}
                    saved={savedJobIds.has(job.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No saved published jobs.
                </p>
              )}
            </section>
            <section className="space-y-3" aria-labelledby="saved-courses-title">
              <h2
                className="font-heading text-lg font-semibold"
                id="saved-courses-title"
              >
                Saved courses
              </h2>
              {coursesResult.data?.length ? (
                coursesResult.data.map((course) => (
                  <CourseCard
                    course={course}
                    key={course.id}
                    organization={organizations.get(course.organization_id)}
                    saved={savedCourseIds.has(course.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No saved published courses.
                </p>
              )}
            </section>
          </div>
        ) : (
          <EmptyState
            title="Nothing saved yet"
            description="Save published jobs or courses and they’ll appear here."
            action={
              <Link
                className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                href="/seeker/jobs"
              >
                Explore opportunities
              </Link>
            }
          />
        )}
      </SeekerPage>
  );
}
