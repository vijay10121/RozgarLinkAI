import type { Metadata } from "next";
import Link from "next/link";

import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrganizations } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Applied jobs" };

export default async function AppliedJobsPage() {
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const { data: applications, error } = await supabase
      .from("applications")
      .select("*")
      .eq("candidate_id", user.id)
      .order("submitted_at", { ascending: false });
  if (error) throw error;

  const jobIds = [...new Set((applications ?? []).map((item) => item.job_id))];
  const { data: jobs, error: jobsError } =
    jobIds.length > 0
      ? await supabase.from("jobs").select("*").in("id", jobIds)
      : { data: [], error: null };
  if (jobsError) throw jobsError;

  const jobById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const organizations = await getOrganizations(
    supabase,
    (jobs ?? []).map((job) => job.organization_id),
  );

  return (
      <SeekerPage
        eyebrow="Your activity"
        title="Applied jobs"
        description="Review application status updates from the database."
      >
        {applications?.length ? (
          <div className="grid gap-3">
            {applications.map((application) => {
              const job = jobById.get(application.job_id);
              return (
                <Card key={application.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div>
                      {job ? (
                        <Link
                          className="font-heading text-lg font-semibold text-foreground underline-offset-4 hover:text-brand hover:underline"
                          href={`/seeker/jobs/${job.id}`}
                        >
                          {job.title}
                        </Link>
                      ) : (
                        <h2 className="font-heading text-lg font-semibold">
                          Job listing unavailable
                        </h2>
                      )}
                      {job ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {organizations.get(job.organization_id)?.name ??
                            "Organization details unavailable"}{" "}
                          · {job.location}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Submitted {application.submitted_at}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold capitalize text-brand">
                      {application.status.replaceAll("_", " ")}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No applications yet"
            description="Eligible applications you submit will appear here."
            action={
              <Link
                className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                href="/seeker/jobs"
              >
                Find jobs
              </Link>
            }
          />
        )}
      </SeekerPage>
  );
}
