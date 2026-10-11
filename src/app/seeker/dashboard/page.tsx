import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Bell, Bookmark, BriefcaseBusiness } from "lucide-react";

import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizations,
  getPublishedJobs,
  isMissingMarketplaceSchemaError,
  type Job,
} from "@/lib/seeker/data";
import { profileCompletion } from "@/lib/seeker/data";
import { JobCard } from "@/components/seeker/job-card";
import { JobCourseSearch } from "@/components/seeker/job-search-form";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Job seeker dashboard" };

export default function SeekerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading your dashboard"
          className="min-h-64 animate-pulse rounded-xl bg-muted"
          role="status"
        >
          <span className="sr-only">Loading your dashboard</span>
        </div>
      }
    >
      <SeekerDashboardContent />
    </Suspense>
  );
}

async function SeekerDashboardContent() {
  await connection();
  const { profile, user } = await requireRole("job_seeker");
  const supabase = await createClient();

  let jobs: Job[] = [];
  let applicationTotal = 0;
  let savedIds = new Set<string>();
  let unreadTotal = 0;
  let marketplaceUnavailable = false;

  try {
    const [publishedJobs, applicationCount, savedRows, unreadCount] =
      await Promise.all([
        getPublishedJobs(supabase),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("candidate_id", user.id),
        supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("candidate_id", user.id),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null),
      ]);

    if (applicationCount.error) throw applicationCount.error;
    if (savedRows.error) throw savedRows.error;
    if (unreadCount.error) throw unreadCount.error;

    jobs = publishedJobs;
    applicationTotal = applicationCount.count ?? 0;
    savedIds = new Set((savedRows.data ?? []).map((row) => row.job_id));
    unreadTotal = unreadCount.count ?? 0;
  } catch (error) {
    if (!isMissingMarketplaceSchemaError(error)) throw error;
    marketplaceUnavailable = true;
  }

  const recommendedJobs = recommendJobs(jobs, profile);
  const organizations = await getOrganizations(
    supabase,
    recommendedJobs.map((job) => job.organization_id),
  );
  const completion = profileCompletion(profile);
  const displayName = profile.display_name?.trim() || "there";

  return (
    <SeekerPage
      eyebrow="Job seeker workspace"
      title={`Welcome, ${displayName}`}
      description="Explore published opportunities and keep your job search moving."
    >
      <JobCourseSearch />
      {marketplaceUnavailable ? (
        <Alert>
          <AlertTitle>Marketplace database setup is required</AlertTitle>
          <AlertDescription>
            Job, application, saved-item, and notification data is not
            available because the marketplace migration has not been applied
            to this Supabase project. From the project folder, link the
            intended Supabase project if needed, then run{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              npx supabase db push
            </code>
            . Refresh this page after the migration completes.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Applications"
            value={String(applicationTotal)}
            icon={<BriefcaseBusiness aria-hidden="true" className="size-5" />}
            href="/seeker/applied"
          />
          <SummaryCard
            label="Saved jobs"
            value={String(savedIds.size)}
            icon={<Bookmark aria-hidden="true" className="size-5" />}
            href="/seeker/saved"
          />
          <SummaryCard
            label="Unread notifications"
            value={String(unreadTotal)}
            icon={<Bell aria-hidden="true" className="size-5" />}
            href="/seeker/notifications"
          />
        </div>
      )}

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Profile completion
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete your profile to improve job eligibility checks.
              </p>
            </div>
            <span className="text-lg font-semibold text-brand">
              {completion}%
            </span>
          </div>
          <div
            aria-label={`Profile ${completion}% complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={completion}
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${completion}%` }}
            />
          </div>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/seeker/profile"
          >
            Update profile <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

      {!marketplaceUnavailable ? (
        <section className="space-y-4" aria-labelledby="recommended-jobs-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                className="font-heading text-xl font-semibold"
                id="recommended-jobs-heading"
              >
                {hasJobPreferences(profile) ? "Recommended jobs" : "Published jobs"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasJobPreferences(profile)
                  ? "Selected from published jobs that match your saved role, location, or skill preferences."
                  : "Add profile preferences to see recommendations tailored to you."}
              </p>
            </div>
            <Link
              className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/seeker/jobs"
            >
              View all
            </Link>
          </div>
          {recommendedJobs.length > 0 ? (
            <div className="grid gap-3">
              {recommendedJobs.slice(0, 5).map((job) => (
                <JobCard
                  job={job}
                  key={job.id}
                  organization={organizations.get(job.organization_id)}
                  saved={savedIds.has(job.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                hasJobPreferences(profile)
                  ? "No matching published jobs yet"
                  : "No published jobs are available"
              }
              description="We’ll show opportunities here when matching published listings are available."
              action={
                <Link
                  className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  href="/seeker/jobs"
                >
                  Browse all jobs
                </Link>
              }
            />
          )}
        </section>
      ) : null}
    </SeekerPage>
  );
}

function recommendJobs<
  T extends {
    title: string;
    location: string;
    required_skills: string[];
    preferred_skills: string[];
  },
>(
  jobs: T[],
  profile: {
    skills?: string[] | null;
    preferred_roles?: string[] | null;
    preferred_locations?: string[] | null;
    location: string | null;
  },
): T[] {
  if (!hasJobPreferences(profile)) return jobs;
  const terms = [...(profile.preferred_locations ?? []), ...(profile.location ? [profile.location] : [])]
    .map((value) => value.toLocaleLowerCase());
  const roles = (profile.preferred_roles ?? []).map((value) => value.toLocaleLowerCase());
  const skills = (profile.skills ?? []).map((value) => value.toLocaleLowerCase());

  return jobs.filter((job) => {
    const title = job.title.toLocaleLowerCase();
    const location = job.location.toLocaleLowerCase();
    const jobSkills = [...job.required_skills, ...job.preferred_skills].map(
      (value) => value.toLocaleLowerCase(),
    );
    return (
      terms.some((term) => location.includes(term)) ||
      roles.some((role) => title.includes(role)) ||
      skills.some((skill) => jobSkills.includes(skill))
    );
  });
}

function hasJobPreferences(profile: {
  skills?: string[] | null;
  preferred_roles?: string[] | null;
  preferred_locations?: string[] | null;
  location: string | null;
}) {
  return Boolean(
    profile.skills?.length ||
      profile.preferred_roles?.length ||
      profile.preferred_locations?.length ||
      profile.location?.trim(),
  );
}

function SummaryCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {label}
        </span>
      </span>
    </Link>
  );
}
