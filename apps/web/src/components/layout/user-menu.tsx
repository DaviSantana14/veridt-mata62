"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuthSession, getAuthSession } from "@/lib/auth-session";
import { currentUser } from "@/lib/mock-data";

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || currentUser.initials;
}

export function UserMenu() {
  const router = useRouter();
  const [user] = useState(() => {
    const session = getAuthSession();

    return {
      name: session?.user.fullName ?? currentUser.name,
      email: session?.user.email ?? currentUser.email,
    };
  });

  function handleLogout() {
    clearAuthSession();
    toast.success("Sessão encerrada.");
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none ring-primary/20 transition focus-visible:ring-4"
          aria-label="Abrir menu do usuário"
        >
          <Avatar className="size-9 border border-primary/20">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-1">
          <span className="truncate text-sm text-foreground">{user.name}</span>
          <span className="truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
