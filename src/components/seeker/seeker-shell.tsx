import type { ReactNode } from "react";
import { connection } from "next/server";
import { UserRound } from "lucide-react";

import { SeekerNavigation } from "@/components/seeker/seeker-navigation";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";
import { createClient } from "@/lib/supabase/server";

export async function SeekerShell({ children }: { children: ReactNode }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("The seeker workspace requires an authenticated session.");
  }

  const [{ data: profile, error: profileError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

  if (profileError) throw new Error("Unable to load your seeker profile.");
    if (countError && !isMissingMarketplaceSchemaError(countError)) {
      throw new Error("Unable to load your notification count.", {
        cause: countError,
      });
    }

    const displayName = profile.display_name?.trim() || user.email || "My account";
    const unreadCount = countError ? null : count ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:px-10">
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Job seeker</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-2 lg:overflow-visible">
          <SeekerNavigation unreadCount={unreadCount} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
