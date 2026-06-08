"use client";

import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAuthSession } from "@/lib/auth-session";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export type SessionUserDisplay = {
  name: string;
  email: string;
};

export function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || currentUser.initials;
}

export function useSessionUserDisplay(): SessionUserDisplay {
  const [user] = useState(() => {
    const session = getAuthSession();

    return {
      name: session?.user.fullName ?? currentUser.name,
      email: session?.user.email ?? currentUser.email,
    };
  });

  return user;
}

export function SessionUserIdentity({
  avatarClassName,
  fallbackClassName,
}: {
  avatarClassName?: string;
  fallbackClassName?: string;
}) {
  const user = useSessionUserDisplay();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className={cn("size-10 border border-primary/20", avatarClassName)}>
        <AvatarFallback
          className={cn(
            "bg-primary text-sm font-semibold text-primary-foreground",
            fallbackClassName,
          )}
        >
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}
