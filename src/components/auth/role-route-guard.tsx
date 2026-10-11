import type { ReactNode } from "react";
import { connection } from "next/server";

import { requireRole } from "@/lib/supabase/auth";
import type { ApplicationRole } from "@/types/supabase";

export async function RoleRouteGuard({
  role,
  children,
}: {
  role: ApplicationRole;
  children: ReactNode;
}) {
  await connection();
  await requireRole(role);
  return children;
}
