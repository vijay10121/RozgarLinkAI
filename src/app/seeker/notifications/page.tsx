import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";
import { NotificationReadButton } from "@/components/seeker/notification-read-button";
import { SeekerPage } from "@/components/seeker/seeker-page";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default function SeekerNotificationsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading notifications" />}>
      <SeekerNotificationsContent />
    </Suspense>
  );
}

async function SeekerNotificationsContent() {
  await connection();
  const { user } = await requireRole("job_seeker");
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
  if (error) {
    if (!isMissingMarketplaceSchemaError(error)) throw error;
    return (
      <SeekerPage
        eyebrow="Updates"
        title="Notifications"
        description="Account updates delivered to you by RozgarLink."
      >
        <MarketplaceSchemaNotice />
      </SeekerPage>
    );
  }

  return (
      <SeekerPage
        eyebrow="Updates"
        title="Notifications"
        description="Account updates delivered to you by RozgarLink."
      >
        {notifications?.length ? (
          <div className="grid gap-3">
            {notifications.map((notification) => (
              <Card
                className={
                  notification.read_at ? "" : "border-brand/40 bg-brand-soft/20"
                }
                key={notification.id}
              >
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-semibold">
                      {notification.title}
                    </h2>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {notification.created_at}
                      {!notification.read_at ? " · Unread" : " · Read"}
                    </p>
                    {notification.href ? (
                      <Link
                        className="mt-2 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={notification.href}
                      >
                        View details
                      </Link>
                    ) : null}
                  </div>
                  {!notification.read_at ? (
                    <NotificationReadButton
                      notificationId={notification.id}
                    />
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No notifications"
            description="There are no account updates to show right now."
          />
        )}
      </SeekerPage>
  );
}
