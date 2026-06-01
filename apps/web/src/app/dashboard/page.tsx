import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/veridit/dashboard-client";

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <DashboardClient />
    </AppShell>
  );
}
