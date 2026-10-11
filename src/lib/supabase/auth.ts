import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

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
