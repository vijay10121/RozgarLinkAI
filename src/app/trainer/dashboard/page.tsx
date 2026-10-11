import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/components/layout/dashboard-placeholder";

export const metadata: Metadata = { title: "Training provider dashboard" };

export default function TrainerDashboardPage() {
  return (
    <DashboardPlaceholder
      title="Your training provider dashboard"
      description="A secure workspace for your training organization."
    />
  );
}
