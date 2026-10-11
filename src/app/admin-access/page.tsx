import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Clock3, ShieldCheck } from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { logoutAction } from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Admin access request" };

export default function AdminAccessPage() {
  return (
    <Suspense fallback={<div aria-label="Checking admin request" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminAccessContent />
    </Suspense>
  );
}

async function AdminAccessContent() {
  await connection();
  const { supabase, user } = await requireAuthenticatedUser();
  const [{ data: profile, error: profileError }, { data: request, error }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("admin_access_requests")
        .select("status, organization_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (profileError || error) {
    throw new Error("Unable to verify the administrator access request.", {
      cause: profileError ?? error,
    });
  }
  if (!profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?error=profile_unavailable");
  }
  if (profile.role === "admin") redirect("/admin/dashboard");
  if (profile.role !== "job_seeker" || !request) {
    redirect("/seeker/dashboard");
  }
  if (request.status === "approved") redirect("/admin/dashboard");

  const rejected = request.status === "rejected";
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <AdminPage
        eyebrow="Administrator registration"
        title={rejected ? "Admin access was not approved" : "Admin access is awaiting review"}
        description={`${request.organization_name} administrator request`}
      >
        {rejected ? (
          <Alert variant="destructive">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Your email is verified, but the access request was rejected</AlertTitle>
            <AlertDescription>
              The account remains a job-seeker account. Contact RozgarLink
              support if you think this decision was made in error.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Clock3 aria-hidden="true" />
            <AlertTitle>Your email is confirmed; admin approval is still required</AlertTitle>
            <AlertDescription>
              Email confirmation verifies your address only. An existing active
              administrator must review the organization request before this
              account receives administrator permissions. You can continue
              using the account as a job seeker while it is pending.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/seeker/dashboard"
          >
            Continue as job seeker
          </Link>
          <form action={logoutAction}>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="submit"
            >
              Log out
            </button>
          </form>
        </div>
      </AdminPage>
    </main>
  );
}
