import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Archive, BookOpenCheck, FileEdit, Plus, Radio } from "lucide-react";

import { TrainerPage } from "@/components/trainer/trainer-page";
import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/states/loading-state";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { getTrainerOrganization } from "@/lib/trainer/data";

export const metadata: Metadata = { title: "Training provider dashboard" };

export default function TrainerDashboardPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading training dashboard" />}>
      <TrainerDashboardContent />
    </Suspense>
  );
}

async function TrainerDashboardContent() {
  await connection();
  const { supabase, profile, user } = await requireRole("training_provider");
  const organization = profile.sector
    ? await getTrainerOrganization(supabase, user.id, profile.sector)
    : null;

  const courses = await supabase
    .from("courses")
    .select("id, title, status, updated_at")
    .eq("owner_provider_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (courses.error && !isMissingMarketplaceSchemaError(courses.error)) {
    throw new Error("Unable to load your courses.", { cause: courses.error });
  }

  if (courses.error) {
    return (
      <TrainerPage title="Training provider dashboard">
        <MarketplaceSchemaNotice />
      </TrainerPage>
    );
  }

  const [published, drafts, archived, metrics] = await Promise.all([
    countCourses(supabase, user.id, "published"),
    countCourses(supabase, user.id, "draft"),
    countCourses(supabase, user.id, "closed"),
    supabase.rpc("provider_course_metrics"),
  ]);
  if (published.error) throw published.error;
  if (drafts.error) throw drafts.error;
  if (archived.error) throw archived.error;
  if (metrics.error && !isMissingMarketplaceSchemaError(metrics.error)) {
    throw new Error("Unable to load course engagement metrics.", {
      cause: metrics.error,
    });
  }

  const totals = (metrics.data ?? []).reduce(
    (result, item) => ({
      saved: result.saved + item.saved_count,
      inquiries: result.inquiries + item.inquiry_count,
      clicks: result.clicks + item.link_click_count,
    }),
    { saved: 0, inquiries: 0, clicks: 0 },
  );
  const metricsByCourseId = new Map(
    (metrics.data ?? []).map((item) => [item.course_id, item]),
  );

  return (
    <TrainerPage
      eyebrow={organization?.name ?? "Provider workspace"}
      title={`Welcome, ${profile.display_name?.trim() || "provider"}`}
      description="Manage your training courses and see how learners interact with published listings."
      actions={
        <Button render={<Link href="/trainer/courses/new" />}>
          <Plus aria-hidden="true" />
          Add course
        </Button>
      }
    >
      {!organization ? (
        <Alert variant="destructive">
          <AlertTitle>No organization is linked to this account</AlertTitle>
          <AlertDescription>
            Course management requires an organization owned by your authenticated
            provider profile. Review your profile or contact support.
          </AlertDescription>
        </Alert>
      ) : null}
      {metrics.error ? <MarketplaceSchemaNotice /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Published"
          value={published.count ?? 0}
          icon={<Radio aria-hidden="true" />}
        />
        <Metric
          label="Drafts"
          value={drafts.count ?? 0}
          icon={<FileEdit aria-hidden="true" />}
        />
        <Metric
          label="Archived"
          value={archived.count ?? 0}
          icon={<Archive aria-hidden="true" />}
        />
      </div>
      <section className="space-y-3" aria-labelledby="course-engagement-heading">
        <div>
          <h2
            className="font-heading text-xl font-semibold"
            id="course-engagement-heading"
          >
            Learner engagement
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved items count current saves. Inquiries and link clicks count
            recorded learner actions; a repeated request with the same action
            key is counted once.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Saved courses" value={totals.saved} />
          <Metric label="Inquiries" value={totals.inquiries} />
          <Metric label="External link clicks" value={totals.clicks} />
          <Metric label="Confirmed enrollments" value="Not tracked" />
        </div>
        <p className="text-xs text-muted-foreground">
          RozgarLink has no enrollment confirmation integration. No enrollments
          are claimed or inferred from clicks, inquiries, or saves.
        </p>
      </section>
      <section className="space-y-3" aria-labelledby="recent-courses-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="font-heading text-xl font-semibold"
              id="recent-courses-heading"
            >
              Your courses
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent courses you own, including unpublished drafts.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
            href="/trainer/courses"
          >
            View all courses
          </Link>
        </div>
        {courses.data?.length ? (
          <div className="grid gap-3">
            {courses.data.map((course) => (
              <Link
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/trainer/courses/${course.id}`}
                key={course.id}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{course.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Updated {new Date(course.updated_at).toLocaleDateString()}
                  </span>
                  {metrics.error ? null : (
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {metricsByCourseId.get(course.id)?.saved_count ?? 0} saved
                      {" · "}
                      {metricsByCourseId.get(course.id)?.inquiry_count ?? 0} inquiries
                      {" · "}
                      {metricsByCourseId.get(course.id)?.link_click_count ?? 0} link clicks
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                  <BookOpenCheck aria-hidden="true" className="size-3.5" />
                  {course.status === "closed" ? "archived" : course.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="font-medium">No courses yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a course draft or publish your first course.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </TrainerPage>
  );
}

function countCourses(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  userId: string,
  status: "published" | "draft" | "closed",
) {
  return supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("owner_provider_id", userId)
    .eq("status", status);
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
        </div>
        {icon ? <span className="text-brand">{icon}</span> : null}
      </CardContent>
    </Card>
  );
}
