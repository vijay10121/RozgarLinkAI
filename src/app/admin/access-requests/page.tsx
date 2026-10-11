import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { AccessRequestReviewForm } from "@/components/admin/access-request-review-form";
import { AdminPage } from "@/components/admin/admin-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Admin access requests" };

type SearchParams = Promise<{ status?: string }>;

export default function AdminAccessRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<div aria-label="Loading access requests" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminAccessRequestsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminAccessRequestsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const status =
    params.status === "approved" || params.status === "rejected"
      ? params.status
      : "pending";
  const { supabase } = await requireRole("admin");
  const { data: requests, error } = await supabase
    .from("admin_access_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Unable to load admin access requests.", { cause: error });
  }

  return (
    <AdminPage
      eyebrow="Account approvals"
      title="Admin access requests"
      description="Review administrator applications. Approval assigns the admin role and creates the applicant’s unverified organization."
    >
      <nav aria-label="Access request status filter" className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((filter) => (
          <a
            aria-current={status === filter ? "page" : undefined}
            className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              status === filter
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            href={`/admin/access-requests?status=${filter}`}
            key={filter}
          >
            {filter}
          </a>
        ))}
      </nav>
      {requests?.length ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">
                      {request.organization_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {request.designation} · {request.requested_sector}
                    </p>
                  </div>
                  <p className="break-all text-xs text-muted-foreground">
                    Applicant ID: {request.user_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(request.created_at).toLocaleString()}
                  </p>
                  {request.status === "pending" ? (
                    <p className="text-xs text-muted-foreground">
                      Email must be confirmed before the applicant can log in.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Reviewed{" "}
                      {request.reviewed_at
                        ? new Date(request.reviewed_at).toLocaleString()
                        : "—"}
                    </p>
                  )}
                </div>
                {request.status === "pending" ? (
                  <AccessRequestReviewForm requestId={request.id} />
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">
                    {request.status}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertTitle>No {status} requests</AlertTitle>
          <AlertDescription>
            {status === "pending"
              ? "New admin signup requests will appear here after their users register."
              : `There are no ${status} administrator requests to show.`}
          </AlertDescription>
        </Alert>
      )}
    </AdminPage>
  );
}
