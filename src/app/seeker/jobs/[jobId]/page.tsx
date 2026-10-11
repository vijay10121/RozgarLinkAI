import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationForm } from "@/components/seeker/application-form";
import { SaveJobButton } from "@/components/seeker/item-actions";
import { RetryButton } from "@/components/seeker/retry-button";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job details" };

export default async function SeekerJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return (
      <SeekerPage title="Job details">
        <Alert variant="destructive">
          <AlertTitle>Job details couldn’t be loaded</AlertTitle>
          <AlertDescription>Try again in a moment.</AlertDescription>
        </Alert>
        <RetryButton />
      </SeekerPage>
    );
  }
  if (!job) notFound();

  const [
    { data: organization },
    { data: saved },
    { data: existingApplication },
    { data: eligibility, error: eligibilityError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", job.organization_id)
      .maybeSingle(),
    supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("candidate_id", user.id)
      .eq("job_id", job.id)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("status")
      .eq("candidate_id", user.id)
      .eq("job_id", job.id)
      .maybeSingle(),
    supabase.rpc("check_job_eligibility", { target_job_id: job.id }),
  ]);

  return (
    <SeekerPage
      eyebrow="Job details"
      title={job.title}
      description={`${organization?.name ?? "Organization details unavailable"} · ${job.location} · ${job.employment_type.replaceAll("_", " ")}`}
      actions={<SaveJobButton jobId={job.id} saved={Boolean(saved)} />}
    >
      <Card>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <section>
            <h2 className="font-heading text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.description}
            </p>
          </section>
          <section>
            <h2 className="font-heading text-lg font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.requirements || "No additional requirements were provided."}
            </p>
            {job.min_experience_years > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Minimum experience: {job.min_experience_years} years
              </p>
            ) : null}
            {job.required_qualifications.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Qualifications: {job.required_qualifications.join(", ")}
              </p>
            ) : null}
            {job.mandatory_education ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Mandatory education: {job.mandatory_education}
              </p>
            ) : null}
            {job.location_restrictions.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Location restrictions: {job.location_restrictions.join(", ")}
              </p>
            ) : null}
          </section>
          <section>
            <h2 className="font-heading text-lg font-semibold">
              Application instructions
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {job.application_instructions || "No additional instructions were provided."}
            </p>
          </section>
          <SkillSection title="Required skills" skills={job.required_skills} />
          <SkillSection
            title="Preferred skills"
            skills={job.preferred_skills}
          />
          {job.application_deadline ? (
            <p className="text-sm text-muted-foreground">
              Application deadline: {job.application_deadline}
            </p>
          ) : null}
          {existingApplication ? (
            <Alert>
              <AlertTitle>Application already submitted</AlertTitle>
              <AlertDescription>
                Current status: {existingApplication.status.replaceAll("_", " ")}.{" "}
                <Link className="font-semibold underline" href="/seeker/applied">
                  View your applications
                </Link>
              </AlertDescription>
            </Alert>
          ) : eligibilityError ? (
            <Alert variant="destructive">
              <AlertTitle>Eligibility is unavailable</AlertTitle>
              <AlertDescription>
                Your application is not enabled until the database eligibility
                check succeeds. Update your profile and try again.
              </AlertDescription>
            </Alert>
          ) : eligibility?.[0]?.eligible ? (
            <ApplicationForm jobId={job.id} />
          ) : (
            <Alert>
              <AlertTitle>Eligibility requirements not met</AlertTitle>
              <AlertDescription>
                Review the job requirements and update your{" "}
                <Link className="font-semibold underline" href="/seeker/profile">
                  candidate profile
                </Link>
                . Eligibility is checked again on submission.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </SeekerPage>
  );
}

function SkillSection({
  title,
  skills,
}: {
  title: string;
  skills: string[];
}) {
  if (skills.length === 0) return null;
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li
            className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand"
            key={skill}
          >
            {skill}
          </li>
        ))}
      </ul>
    </section>
  );
}
