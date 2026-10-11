import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { AdminJobForm } from "@/components/admin/job-form";
import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOwnOrganizations } from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Create job" };

export default function NewAdminJobPage() {
  return (
    <Suspense
      fallback={<div aria-label="Loading job form" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}
    >
      <NewAdminJobContent />
    </Suspense>
  );
}

async function NewAdminJobContent() {
  await connection();
  const { supabase, user } = await requireRole("admin");
  const organizations = await getOwnOrganizations(supabase, user.id);

  return (
    <AdminPage
      eyebrow="Job management"
      title="Create a job"
      description="Save an unpublished draft or publish a verified opportunity for candidates."
    >
      {organizations.length === 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Organization access is required</AlertTitle>
          <AlertDescription>
            This account has no organization that it owns. Ask the platform
            administrator to correct organization provisioning before creating
            jobs.
          </AlertDescription>
        </Alert>
      ) : (
        <AdminJobForm organizations={organizations} />
      )}
    </AdminPage>
  );
}
