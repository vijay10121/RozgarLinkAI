import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { ApplicationStatusForm } from "@/components/admin/application-status-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  boundedPage,
  getApplicationsForAdminJobs,
  getOwnedJobIds,
  getOwnedJobOptions,
  getOwnOrganizations,
} from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";
import {
  isAdminApplicationStatus,
  validAdminStatusTransition,
} from "@/lib/admin/validation";

export const metadata: Metadata = { title: "Applicants" };

type SearchParams = Promise<{
  job?: string;
  status?: string;
  page?: string;
}>;

export default function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<div aria-label="Loading applications" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminApplicationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminApplicationsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const { supabase, user } = await requireRole("admin");
  const page = boundedPage(params.page);
  const pageSize = 15;
  const [organizations, ownedJobIds, jobOptions] = await Promise.all([
    getOwnOrganizations(supabase, user.id),
    getOwnedJobIds(supabase, user.id),
    getOwnedJobOptions(supabase, user.id),
  ]);
  const validJob = ownedJobIds.includes(params.job ?? "");
  const status = params.status && isAdminApplicationStatus(params.status)
    ? params.status
    : undefined;
  const { items, count } = await getApplicationsForAdminJobs(
    supabase,
    user.id,
    ownedJobIds,
    {
      jobId: validJob ? params.job : undefined,
      status,
      range: [(page - 1) * pageSize, page * pageSize - 1],
    },
  );
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const hrefForPage = (nextPage: number) => {
    const query = new URLSearchParams();
    if (validJob && params.job) query.set("job", params.job);
    if (status) query.set("status", status);
    query.set("page", String(nextPage));
    return `/admin/applications?${query.toString()}`;
  };

  return (
    <AdminPage
      eyebrow="Hiring"
      title="Applicants"
      description="Review applications and update candidate status for your organization’s jobs."
    >
      {organizations.length === 0 ? (
        <Alert>
          <AlertTitle>No organization is linked to this account</AlertTitle>
          <AlertDescription>
            Applicant records are restricted to jobs owned by your
            organization. Contact the platform administrator about your
            organization setup.
          </AlertDescription>
        </Alert>
      ) : null}
      <form
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
        method="get"
      >
        <label className="space-y-1 text-xs font-medium" htmlFor="application-job">
          Job
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={validJob ? params.job : ""}
            id="application-job"
            name="job"
          >
            <option value="">All your jobs</option>
            {jobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium" htmlFor="application-status">
          Status
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={status ?? ""}
            id="application-status"
            name="status"
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="selected">Selected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>
        <button className="h-9 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2" type="submit">
          Apply filters
        </button>
      </form>

      {items.length ? (
        <div className="space-y-3">
          {items.map(({ application, candidate, job }) => {
            const options = (
              ["submitted", "under_review", "shortlisted", "rejected", "selected"] as const
            ).filter((next) =>
              validAdminStatusTransition(application.status, next),
            );
            return (
              <article
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-start lg:justify-between"
                key={application.id}
              >
                <div className="min-w-0 space-y-1">
                  <h2 className="font-heading text-lg font-semibold">
                    {candidate?.display_name ?? "Candidate"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Applied to{" "}
                    {job ? (
                      <Link className="font-medium text-brand underline" href={`/admin/jobs/${job.id}`}>
                        {job.title}
                      </Link>
                    ) : (
                      "job"
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {candidate?.location ?? "Location not provided"}
                    {candidate?.experience_years !== null &&
                    candidate?.experience_years !== undefined
                      ? ` · ${candidate.experience_years} years experience`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {candidate?.education ?? "Education not provided"}
                  </p>
                  {candidate?.qualifications.length ? (
                    <p className="text-xs text-muted-foreground">
                      Qualifications: {candidate.qualifications.join(", ")}
                    </p>
                  ) : null}
                  {candidate?.skills.length ? (
                    <p className="text-xs text-muted-foreground">
                      Skills: {candidate.skills.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(application.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm capitalize">
                    Current status: {application.status.replaceAll("_", " ")}
                  </p>
                  <ApplicationStatusForm
                    applicationId={application.id}
                    currentStatus={application.status}
                    options={[...options]}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          No applications match your filters.
        </p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages} · {count} applications
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link className="rounded-lg border border-border px-3 py-2" href={hrefForPage(page - 1)}>
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link className="rounded-lg border border-border px-3 py-2" href={hrefForPage(page + 1)}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
