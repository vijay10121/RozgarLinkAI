import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  getDashboardPath,
  isMissingAuthSessionError,
} from "@/lib/auth-routing";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationRole } from "@/types/supabase";

export async function requireAuthenticatedUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error("Unable to verify the current Supabase user.", {
      cause: error,
    });
  }

  if (!data.user) {
    throw new Error("Authentication is required for this operation.");
  }

  return { supabase, user: data.user };
}

export async function requireRole(requiredRole: ApplicationRole) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSessionError(authError)) {
    redirect("/login?error=session_check_failed");
  }

  if (!user) {
    redirect("/login?error=session_expired");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect("/login?error=profile_unavailable");
  }

  if (!profile) {
    redirect("/login?error=profile_missing");
  }

  if (profile.account_status !== "active") {
    redirect("/login?error=account_suspended");
  }

  if (profile.role !== requiredRole) {
    redirect(getDashboardPath(profile.role));
  }

  return { supabase, user, profile };
}
