import Link from "next/link";

import { SaveJobButton } from "@/components/seeker/item-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, OrganizationSummary } from "@/lib/seeker/data";
import type { RecommendationJob } from "@/lib/matching/types";

type JobCardData = Pick<
  Job,
  | "id"
  | "title"
  | "location"
  | "employment_type"
  | "required_skills"
  | "application_deadline"
> &
  Partial<Pick<Job, "preferred_skills">>;

export function JobCard({
  job,
  organization,
  saved,
}: {
  job: JobCardData | RecommendationJob;
  organization?: OrganizationSummary;
  saved: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            className="rounded-sm font-heading text-lg font-semibold text-foreground underline-offset-4 hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/seeker/jobs/${job.id}`}
          >
            {job.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization?.name ?? "Organization details unavailable"} · {job.location}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {job.employment_type.replaceAll("_", " ")}
            </span>
            {job.required_skills.slice(0, 5).map((skill) => (
              <span
                className="rounded-full border border-border px-2.5 py-1 text-muted-foreground"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
          {job.application_deadline ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Apply by {job.application_deadline}
            </p>
          ) : null}
        </div>
        <SaveJobButton jobId={job.id} saved={saved} />
      </CardContent>
    </Card>
  );
}
