import type { ReactNode } from "react";
import { Suspense } from "react";

import { RoleRouteGuard } from "@/components/auth/role-route-guard";
import { TrainerShell } from "@/components/trainer/trainer-shell";

export default function TrainerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-64" />}>
      <RoleRouteGuard role="training_provider">
        <TrainerShell>{children}</TrainerShell>
      </RoleRouteGuard>
    </Suspense>
  );
}
