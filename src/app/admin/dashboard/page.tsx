import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/layout/dashboard-placeholder";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminDashboardPage() {
  return (
    <DashboardPlaceholder
      title="Your admin dashboard"
      description="A secure workspace for authorized RozgarLink administrators."
    />
  );
}
