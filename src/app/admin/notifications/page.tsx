import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { AdminPage } from "@/components/admin/admin-page";
import { MarkAdminNotificationRead } from "@/components/admin/admin-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Admin notifications" };

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<div aria-label="Loading notifications" className="min-h-64 animate-pulse rounded-xl bg-muted" role="status" />}>
      <AdminNotificationsContent />
    </Suspense>
  );
}

async function AdminNotificationsContent() {
  await connection();
  const { supabase, user } = await requireRole("admin");
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error && !isMissingMarketplaceSchemaError(error)) {
    throw new Error("Unable to load your notifications.", { cause: error });
  }

  return (
    <AdminPage
      eyebrow="Account updates"
      title="Notifications"
      description="Private updates for your administrator account."
    >
      {error ? (
        <Alert>
          <AlertTitle>Marketplace database setup is required</AlertTitle>
          <AlertDescription>
            The notification table is unavailable. Apply the project migrations
            with <code>npx supabase db push</code>.
          </AlertDescription>
        </Alert>
      ) : notifications?.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              className={`flex flex-col gap-4 rounded-xl border border-border p-5 sm:flex-row sm:items-start sm:justify-between ${
                notification.read_at ? "bg-card" : "bg-brand-soft/20"
              }`}
              key={notification.id}
            >
              <div className="min-w-0">
                <h2 className="font-heading font-semibold">
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
                    className="mt-2 inline-block text-sm font-semibold text-brand underline"
                    href={notification.href}
                  >
                    View details
                  </Link>
                ) : null}
              </div>
              {!notification.read_at ? (
                <MarkAdminNotificationRead
                  notificationId={notification.id}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          No notifications to show.
        </p>
      )}
    </AdminPage>
  );
}
