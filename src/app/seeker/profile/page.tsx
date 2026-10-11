import type { Metadata } from "next";

import { ProfileForm } from "@/components/seeker/profile-form";
import { ResumeUploader } from "@/components/seeker/resume-uploader";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { profileCompletion } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "My profile" };

export default async function SeekerProfilePage() {
  const { profile, user } = await requireRole("job_seeker");
  const completion = profileCompletion(profile);

  return (
    <SeekerPage
      eyebrow="Candidate information"
      title="My profile"
      description="Keep your skills and preferences current for trusted eligibility checks and relevant job discovery."
    >
      <Alert>
        <AlertTitle>Profile completion: {completion}%</AlertTitle>
        <AlertDescription>
          Profile information is private to your account and is used for job
          eligibility checks.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="p-5 sm:p-7">
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-7">
          <div>
            <h2 className="font-heading text-lg font-semibold">Resume</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an optional resume. Files are stored privately and can
              only be downloaded by you.
            </p>
          </div>
          <ResumeUploader userId={user.id} resumePath={profile.resume_path} />
        </CardContent>
      </Card>
    </SeekerPage>
  );
}
