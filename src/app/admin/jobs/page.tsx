import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { boundedPage, getOwnOrganizations } from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Manage jobs" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div aria-label="Loading jobs" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />
      }
    >
      <AdminJobsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminJobsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const { supabase, user } = await requireRole("admin");
  const organizations = await getOwnOrganizations(supabase, user.id);
  const query = params.q?.trim().slice(0, 200) ?? "";
  const page = boundedPage(params.page);
  const pageSize = 15;
  const today = new Date().toISOString().slice(0, 10);

  let jobsQuery = supabase
    .from("jobs")
    .select(
      "id, organization_id, title, location, employment_type, status, application_deadline, published_at, created_at",
      { count: "exact" },
    )
    .eq("owner_admin_id", user.id)
    .order("created_at", { ascending: false });

  if (query) jobsQuery = jobsQuery.ilike("title", `%${query}%`);
  if (params.status === "expired") {
    jobsQuery = jobsQuery
      .eq("status", "published")
      .lt("application_deadline", today);
  } else if (
    params.status === "draft" ||
    params.status === "published" ||
    params.status === "closed"
  ) {
    jobsQuery = jobsQuery.eq("status", params.status);
  }
  const { data: jobs, count, error } = await jobsQuery.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  if (error) throw new Error("Unable to load your jobs.", { cause: error });

  const organizationById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const paramsForPage = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (params.status) next.set("status", params.status);
    next.set("page", String(nextPage));
    return `/admin/jobs?${next.toString()}`;
  };

  return (
    <AdminPage
      eyebrow="Opportunities"
      title="Manage jobs"
      description="Create and maintain the jobs published by your organization."
      actions={
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/admin/jobs/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Create job
        </Link>
      }
    >
      {organizations.length === 0 ? (
        <Alert>
          <AlertTitle>No organization is available</AlertTitle>
          <AlertDescription>
            Your account can manage jobs only for an organization that it owns.
            Contact the platform administrator to resolve provisioning.
          </AlertDescription>
        </Alert>
      ) : null}
      <form
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_200px_auto]"
        method="get"
        role="search"
      >
        <label className="sr-only" htmlFor="admin-job-search">
          Search job titles
        </label>
        <Input
          className="bg-background"
          defaultValue={query}
          id="admin-job-search"
          maxLength={200}
          name="q"
          placeholder="Search job titles"
        />
        <label className="sr-only" htmlFor="admin-job-status">
          Filter jobs by status
        </label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={params.status ?? ""}
          id="admin-job-status"
          name="status"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
          <option value="expired">Expired</option>
        </select>
        <Button className="gap-2" type="submit">
          <Search aria-hidden="true" className="size-4" />
          Filter
        </Button>
      </form>

      {jobs?.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => {
                const isExpired =
                  job.status === "published" &&
                  Boolean(job.application_deadline && job.application_deadline < today);
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-foreground underline-offset-4 hover:text-brand hover:underline"
                        href={`/admin/jobs/${job.id}`}
                      >
                        {job.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.location} · {job.employment_type.replaceAll("_", " ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {organizationById.get(job.organization_id)?.name ??
                        "Organization"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        {isExpired ? "Expired" : job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {job.application_deadline ?? "No deadline"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-brand underline-offset-4 hover:underline"
                        href={`/admin/jobs/${job.id}/edit`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          {query || params.status
            ? "No jobs match these filters."
            : "No jobs have been created for your organization yet."}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages}
          {count !== null ? ` · ${count} jobs` : ""}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={paramsForPage(page - 1)}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={paramsForPage(page + 1)}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
