import type { ReactNode } from "react";
import { Suspense } from "react";

import { RoleRouteGuard } from "@/components/auth/role-route-guard";
import { SeekerShell } from "@/components/seeker/seeker-shell";

export default function SeekerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-64" />}>
      <RoleRouteGuard role="job_seeker">
        <SeekerShell>{children}</SeekerShell>
      </RoleRouteGuard>
    </Suspense>
  );
}
