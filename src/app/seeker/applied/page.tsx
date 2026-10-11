import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";

import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  isMissingMarketplaceSchemaError,
} from "@/lib/seeker/data";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrganizations } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Applied jobs" };

export default function AppliedJobsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading applied jobs" />}>
      <AppliedJobsContent />
    </Suspense>
  );
}

async function AppliedJobsContent() {
  await connection();
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const { data: applications, error } = await supabase
      .from("applications")
      .select("*")
      .eq("candidate_id", user.id)
      .order("submitted_at", { ascending: false });
  if (error) {
    if (!isMissingMarketplaceSchemaError(error)) throw error;
    return (
      <SeekerPage
        eyebrow="Your activity"
        title="Applied jobs"
        description="Review application status updates from the database."
      >
        <MarketplaceSchemaNotice />
      </SeekerPage>
    );
  }

  const jobIds = [...new Set((applications ?? []).map((item) => item.job_id))];
  const { data: jobs, error: jobsError } =
    jobIds.length > 0
      ? await supabase.from("jobs").select("*").in("id", jobIds)
      : { data: [], error: null };
  if (jobsError) {
    if (!isMissingMarketplaceSchemaError(jobsError)) throw jobsError;
    return (
      <SeekerPage
        eyebrow="Your activity"
        title="Applied jobs"
        description="Review application status updates from the database."
      >
        <MarketplaceSchemaNotice />
      </SeekerPage>
    );
  }

  const jobById = new Map((jobs ?? []).map((job) => [job.id, job]));
  let organizations;
  try {
    organizations = await getOrganizations(
      supabase,
      (jobs ?? []).map((job) => job.organization_id),
    );
  } catch (organizationError) {
    if (!isMissingMarketplaceSchemaError(organizationError)) {
      throw organizationError;
    }
    return (
      <SeekerPage
        eyebrow="Your activity"
        title="Applied jobs"
        description="Review application status updates from the database."
      >
        <MarketplaceSchemaNotice />
      </SeekerPage>
    );
  }

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
