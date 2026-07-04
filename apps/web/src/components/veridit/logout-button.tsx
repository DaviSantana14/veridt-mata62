"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth-session";

type LogoutButtonProps = Omit<
  ComponentProps<typeof Button>,
  "asChild" | "onClick" | "type"
>;

export function LogoutButton({
  children = "Sair",
  ...props
}: LogoutButtonProps) {
  const router = useRouter();

  function handleLogout() {
    clearAuthSession();
    toast.success("Sessão encerrada.");
    router.replace("/login");
  }

  return (
    <Button type="button" {...props} onClick={handleLogout}>
      <LogOut data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
