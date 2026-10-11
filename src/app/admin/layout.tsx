import type { ReactNode } from "react";
import { Suspense } from "react";

import { RoleRouteGuard } from "@/components/auth/role-route-guard";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-64" />}>
      <RoleRouteGuard role="admin">{children}</RoleRouteGuard>
    </Suspense>
  );
}
