import { AppShell } from "@/components/layout/app-shell";
import { ProfileClient } from "@/components/veridit/profile-client";

export default function ProfilePage() {
  return (
    <AppShell active="profile">
      <ProfileClient />
    </AppShell>
  );
}
