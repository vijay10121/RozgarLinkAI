import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Search } from "lucide-react";

import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizations,
  isMissingMarketplaceSchemaError,
  searchPublishedJobs,
} from "@/lib/seeker/data";
import { JobCard } from "@/components/seeker/job-card";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Find jobs" };

type SearchParams = Promise<{
  title?: string;
  location?: string;
  skill?: string;
  employment_type?: string;
}>;

const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
];

export default function SeekerJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading published jobs"
          className="min-h-64 animate-pulse rounded-xl bg-muted"
          role="status"
        >
          <span className="sr-only">Loading published jobs</span>
        </div>
      }
    >
      <SeekerJobsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SeekerJobsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const [jobsResult, savedRows] = await Promise.all([
    searchPublishedJobs(supabase, {
        title: params.title,
        location: params.location,
        skill: params.skill,
        employmentType: params.employment_type,
      }),
    supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("candidate_id", user.id),
  ]);

  const marketplaceUnavailable =
    !jobsResult.available ||
    Boolean(
      savedRows.error && isMissingMarketplaceSchemaError(savedRows.error),
    );
  if (savedRows.error && !isMissingMarketplaceSchemaError(savedRows.error)) {
    throw savedRows.error;
  }
  const jobs = jobsResult.jobs;
  const savedIds = new Set(
    (savedRows.error ? [] : savedRows.data ?? []).map((row) => row.job_id),
  );
  const organizations = await getOrganizations(
    supabase,
    jobs.map((job) => job.organization_id),
  );

  return (
      <SeekerPage
        eyebrow="Opportunities"
        title="Find jobs"
        description="Search currently published and available positions."
      >
        <form
          className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
          method="get"
          role="search"
        >
          <label className="space-y-1 text-xs font-medium" htmlFor="job-title">
            Job title
            <Input
              className="bg-background"
              defaultValue={params.title}
              id="job-title"
              maxLength={200}
              name="title"
              placeholder="Search titles"
            />
          </label>
          <label className="space-y-1 text-xs font-medium" htmlFor="job-location">
            Location
            <Input
              className="bg-background"
              defaultValue={params.location}
              id="job-location"
              maxLength={200}
              name="location"
              placeholder="City or region"
            />
          </label>
          <label className="space-y-1 text-xs font-medium" htmlFor="job-skill">
            Required or preferred skill
            <Input
              className="bg-background"
              defaultValue={params.skill}
              id="job-skill"
              maxLength={120}
              name="skill"
              placeholder="Enter an exact skill"
            />
          </label>
          <label className="space-y-1 text-xs font-medium" htmlFor="employment-type">
            Employment type
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue={params.employment_type ?? ""}
              id="employment-type"
              name="employment_type"
            >
              <option value="">Any type</option>
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <Button className="gap-2 sm:col-span-2 lg:col-span-4" type="submit">
            <Search aria-hidden="true" className="size-4" />
            Search jobs
          </Button>
        </form>

        {marketplaceUnavailable ? (
          <Alert>
            <AlertTitle>Marketplace database setup is required</AlertTitle>
            <AlertDescription>
              Published jobs are unavailable because the marketplace migration
              has not been applied to this Supabase project. From the project
              folder, link the intended project if needed and run{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                npx supabase db push
              </code>
              , then refresh this page.
            </AlertDescription>
          </Alert>
        ) : jobs.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {jobs.length} published {jobs.length === 1 ? "job" : "jobs"} shown
            {jobs.length === 100 ? " (first 100 matches)" : ""}.
          </p>
        ) : (
          <EmptyState
            title="No jobs found"
            description="Try adjusting your search, or check back when more positions are published."
          />
        )}
        {!marketplaceUnavailable ? (
          <div className="grid gap-3">
            {jobs.map((job) => (
              <JobCard
                job={job}
                key={job.id}
                organization={organizations.get(job.organization_id)}
                saved={savedIds.has(job.id)}
              />
            ))}
          </div>
        ) : null}
      </SeekerPage>
  );
}
