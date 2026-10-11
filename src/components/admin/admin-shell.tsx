import type { ReactNode } from "react";
import { UserRound } from "lucide-react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { requireRole } from "@/lib/supabase/auth";

export async function AdminShell({ children }: { children: ReactNode }) {
  const { supabase, profile, user } = await requireRole("admin");
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error && !isMissingMarketplaceSchemaError(error)) {
    throw new Error("Unable to load your notification count.", { cause: error });
  }

  const displayName =
    profile.display_name?.trim() || user.email || "My account";

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:px-10">
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Administrator</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-2 lg:overflow-visible">
          <AdminNavigation unreadCount={error ? null : count ?? 0} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
