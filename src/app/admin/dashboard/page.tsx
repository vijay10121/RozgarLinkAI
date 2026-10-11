import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import {
  BriefcaseBusiness,
  CircleCheck,
  Clock3,
  FileEdit,
  Plus,
} from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  getApplicationsForAdminJobs,
  getOwnedJobIds,
  getOwnOrganizations,
} from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading admin dashboard"
          className="min-h-64 animate-pulse rounded-xl bg-muted"
          role="status"
        />
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  await connection();
  const { supabase, user } = await requireRole("admin");
  const organizations = await getOwnOrganizations(supabase, user.id);
  const now = new Date().toISOString().slice(0, 10);
  const countQuery = () =>
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("owner_admin_id", user.id);
  const publishedQuery = countQuery()
    .eq("status", "published")
    .or(`application_deadline.is.null,application_deadline.gte.${now}`);
  const expiredQuery = countQuery()
    .eq("status", "published")
    .lt("application_deadline", now);
  const draftQuery = countQuery().eq("status", "draft");
  const closedQuery = countQuery().eq("status", "closed");
  const [publishedCount, expiredCount, draftCount, closedCount, jobIds] =
    await Promise.all([
      publishedQuery,
      expiredQuery,
      draftQuery,
      closedQuery,
      getOwnedJobIds(supabase, user.id),
    ]);
  if (publishedCount.error) throw publishedCount.error;
  if (expiredCount.error) throw expiredCount.error;
  if (draftCount.error) throw draftCount.error;
  if (closedCount.error) throw closedCount.error;
  const activePublished = publishedCount.count ?? 0;
  const expired = expiredCount.count ?? 0;
  const drafts = draftCount.count ?? 0;
  const closed = closedCount.count ?? 0;
  const recent = await getApplicationsForAdminJobs(
    supabase,
    user.id,
    jobIds,
    { limit: 8 },
  );

  return (
    <AdminPage
      eyebrow="Organization workspace"
      title="Admin dashboard"
      description="Manage your organization’s published opportunities and review candidate applications."
      actions={
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/admin/jobs/new"
        >
            <Plus aria-hidden="true" />
            Create job
        </Link>
      }
    >
      {organizations.length === 0 ? (
        <Alert>
          <AlertTitle>No organization is linked to this admin account</AlertTitle>
          <AlertDescription>
            Job management is limited to organizations owned by your account.
            Contact the platform administrator to resolve organization
            provisioning; this workspace will not create an organization
            automatically.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Published" value={activePublished} icon={<CircleCheck />} />
        <Metric label="Draft" value={drafts} icon={<FileEdit />} />
        <Metric label="Closed" value={closed} icon={<BriefcaseBusiness />} />
        <Metric label="Expired" value={expired} icon={<Clock3 />} />
      </div>

      <section className="space-y-3" aria-labelledby="recent-applications">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold" id="recent-applications">
              Recent applications
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Applications submitted to jobs owned by your organization.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
            href="/admin/applications"
          >
            View applicants
          </Link>
        </div>
        {recent.items.length ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.items.map(({ application, candidate, job }) => (
                  <tr key={application.id}>
                    <td className="px-4 py-3">
                      {candidate?.display_name ?? "Candidate"}
                    </td>
                    <td className="px-4 py-3">{job?.title ?? "Job unavailable"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(application.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {application.status.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {jobIds.length
                ? "There are no applications for your jobs yet."
                : "Create and publish a job to receive applications."}
            </CardContent>
          </Card>
        )}
      </section>
    </AdminPage>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
