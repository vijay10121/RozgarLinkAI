import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import {
  TrainerOrganizationForm,
  TrainerPersonalProfileForm,
} from "@/components/trainer/trainer-profile-forms";
import { TrainerPage } from "@/components/trainer/trainer-page";
import { LoadingState } from "@/components/states/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { getTrainerOrganization } from "@/lib/trainer/data";

export const metadata: Metadata = { title: "Provider profile" };

export default function TrainerProfilePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading provider profile" />}>
      <TrainerProfileContent />
    </Suspense>
  );
}

async function TrainerProfileContent() {
  await connection();
  const { supabase, profile, user } = await requireRole("training_provider");
  const organization = profile.sector
    ? await getTrainerOrganization(supabase, user.id, profile.sector)
    : null;

  return (
    <TrainerPage
      eyebrow="Account settings"
      title="Provider profile"
      description="Update your personal details and the organization linked to your provider account."
    >
      <Card>
        <CardContent className="p-5 sm:p-7">
          <h2 className="mb-5 font-heading text-lg font-semibold">
            Personal provider profile
          </h2>
          <TrainerPersonalProfileForm email={user.email ?? ""} profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 sm:p-7">
          <h2 className="mb-2 font-heading text-lg font-semibold">
            Institute or company
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Sector is controlled by your account. Verification status is
            separate and can only be changed by an authorized platform reviewer.
          </p>
          {organization ? (
            <TrainerOrganizationForm organization={organization} />
          ) : (
            <Alert variant="destructive">
              <AlertTitle>No organization is linked to this account</AlertTitle>
              <AlertDescription>
                Contact support to resolve provider organization provisioning.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TrainerPage>
  );
}
