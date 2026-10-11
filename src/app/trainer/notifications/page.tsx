import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { TrainerNotificationReadForm } from "@/components/trainer/notification-read-form";
import { TrainerPage } from "@/components/trainer/trainer-page";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Provider notifications" };

export default function TrainerNotificationsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading provider notifications" />}>
      <TrainerNotificationsContent />
    </Suspense>
  );
}

async function TrainerNotificationsContent() {
  await connection();
  const { supabase, user } = await requireRole("training_provider");
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingMarketplaceSchemaError(error)) {
      return (
        <TrainerPage title="Notifications">
          <MarketplaceSchemaNotice />
        </TrainerPage>
      );
    }
    throw new Error("Unable to load your notifications.", { cause: error });
  }

  return (
    <TrainerPage
      eyebrow="Account updates"
      title="Notifications"
      description="Course publication and account updates delivered to your provider account."
    >
      {notifications.length ? (
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
                    {new Date(notification.created_at).toLocaleString()} ·{" "}
                    {notification.read_at ? "Read" : "Unread"}
                  </p>
                  {notification.href ? (
                    <Link
                      className="mt-2 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline"
                      href={notification.href}
                    >
                      View details
                    </Link>
                  ) : null}
                </div>
                {!notification.read_at ? (
                  <TrainerNotificationReadForm
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
          description="There are no provider account updates to show right now."
        />
      )}
    </TrainerPage>
  );
}
