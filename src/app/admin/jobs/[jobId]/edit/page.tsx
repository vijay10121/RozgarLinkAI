import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

import { AdminJobForm } from "@/components/admin/job-form";
import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOwnOrganizations, getOwnedJob } from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Edit job" };

export default function EditAdminJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  return (
    <Suspense fallback={<div aria-label="Loading job form" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <EditAdminJobContent params={params} />
    </Suspense>
  );
}

async function EditAdminJobContent({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  await connection();
  const { jobId } = await params;
  const { supabase, user } = await requireRole("admin");
  const job = await getOwnedJob(supabase, user.id, jobId);
  if (!job) notFound();
  const organizations = await getOwnOrganizations(supabase, user.id);

  return (
    <AdminPage
      eyebrow="Job management"
      title="Edit job"
      description="Changes apply only to the job owned by your organization."
    >
      {job.status === "closed" ? (
        <Alert>
          <AlertTitle>This job is closed</AlertTitle>
          <AlertDescription>
            Closed jobs are final and cannot be edited or republished.
          </AlertDescription>
        </Alert>
      ) : organizations.length ? (
        <AdminJobForm job={job} organizations={organizations} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Organization access is unavailable</AlertTitle>
          <AlertDescription>
            The job organization could not be verified for your account.
          </AlertDescription>
        </Alert>
      )}
    </AdminPage>
  );
}
