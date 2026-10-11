import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

import { CloseJobForm } from "@/components/admin/admin-actions";
import { AdminPage } from "@/components/admin/admin-page";
import { ApplicationStatusForm } from "@/components/admin/application-status-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  getApplicationsForAdminJobs,
  getOwnOrganizations,
  getOwnedJob,
} from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";
import { validAdminStatusTransition } from "@/lib/admin/validation";

export const metadata: Metadata = { title: "Job details" };

export default function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  return (
    <Suspense fallback={<div aria-label="Loading job details" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminJobDetailContent params={params} />
    </Suspense>
  );
}

async function AdminJobDetailContent({
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
  const organization = organizations.find(
    (candidate) => candidate.id === job.organization_id,
  );
  const results = await getApplicationsForAdminJobs(
    supabase,
    user.id,
    [job.id],
    { limit: 10 },
  );

  return (
    <AdminPage
      eyebrow="Job details"
      title={job.title}
      description={`${organization?.name ?? "Your organization"} · ${job.location} · ${job.employment_type.replaceAll("_", " ")}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {job.status !== "closed" ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/admin/jobs/${job.id}/edit`}
            >
              Edit job
            </Link>
          ) : null}
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/admin/jobs"
          >
            All jobs
          </Link>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
              {job.status}
            </span>
            {job.application_deadline ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs">
                Deadline {job.application_deadline}
              </span>
            ) : null}
          </div>
          <section>
            <h2 className="font-heading text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.description}
            </p>
          </section>
          <section>
            <h2 className="font-heading text-lg font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.requirements || "No additional requirements."}
            </p>
            {job.mandatory_education ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Mandatory education: {job.mandatory_education}
              </p>
            ) : null}
            {job.required_qualifications.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Qualifications: {job.required_qualifications.join(", ")}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              Minimum experience: {job.min_experience_years} years
            </p>
            {job.location_restrictions.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Location restrictions: {job.location_restrictions.join(", ")}
              </p>
            ) : null}
          </section>
          <SkillList label="Required skills" values={job.required_skills} />
          <SkillList label="Preferred skills" values={job.preferred_skills} />
          <section>
            <h2 className="font-heading text-lg font-semibold">
              Application instructions
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.application_instructions || "No additional instructions."}
            </p>
          </section>
          {job.status !== "closed" ? <CloseJobForm jobId={job.id} /> : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Applicants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Candidate information is shown only for applications to this
            organization’s job.
          </p>
        </div>
        {results.items.length ? (
          <div className="grid gap-3">
            {results.items.map(({ application, candidate }) => {
              const options = (
                ["submitted", "under_review", "shortlisted", "rejected", "selected"] as const
              ).filter((status) =>
                validAdminStatusTransition(application.status, status),
              );
              return (
                <Card key={application.id}>
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-semibold">
                        {candidate?.display_name ?? "Candidate"}
                      </h3>
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
                      {candidate?.skills.length ? (
                        <p className="text-xs text-muted-foreground">
                          Skills: {candidate.skills.join(", ")}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Applied{" "}
                        {new Date(application.submitted_at).toLocaleString()}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        Current status: {application.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <ApplicationStatusForm
                      applicationId={application.id}
                      currentStatus={application.status}
                      options={[...options]}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertTitle>No applications yet</AlertTitle>
            <AlertDescription>
              Applications submitted to this job will appear here.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </AdminPage>
  );
}

function SkillList({ label, values }: { label: string; values: string[] }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold">{label}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {values.length ? values.join(", ") : "None specified"}
      </p>
    </section>
  );
}
