import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import {
  AdminOrganizationForm,
  AdminPersonalProfileForm,
} from "@/components/admin/admin-profile-forms";
import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnOrganizations } from "@/lib/admin/data";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Admin profile" };

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<div aria-label="Loading admin profile" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminProfileContent />
    </Suspense>
  );
}

async function AdminProfileContent() {
  await connection();
  const { supabase, profile, user } = await requireRole("admin");
  const organizations = await getOwnOrganizations(supabase, user.id);

  return (
    <AdminPage
      eyebrow="Account settings"
      title="Admin profile"
      description="Manage your personal contact details and the organization you own."
    >
      <Card>
        <CardContent className="p-5 sm:p-7">
          <h2 className="mb-5 font-heading text-lg font-semibold">
            Personal profile
          </h2>
          <AdminPersonalProfileForm
            email={user.email ?? ""}
            profile={profile}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 sm:p-7">
          <h2 className="mb-2 font-heading text-lg font-semibold">
            Organization
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Sector and verification are managed separately by the platform.
          </p>
          {organizations.length ? (
            <AdminOrganizationForm organization={organizations[0]} />
          ) : (
            <Alert variant="destructive">
              <AlertTitle>No owned organization found</AlertTitle>
              <AlertDescription>
                Organization details can be changed only when the organization
                record is linked to your authenticated account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
