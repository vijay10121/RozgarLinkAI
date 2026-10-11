import Link from "next/link";
import { connection } from "next/server";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

export async function AuthNavigation() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <LogoutButton />
  ) : (
    <Link
      className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href="/login"
    >
      Log in
    </Link>
  );
}
