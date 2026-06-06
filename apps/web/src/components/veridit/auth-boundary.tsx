"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_SESSION_CHANGED_EVENT,
  getAuthSession,
} from "@/lib/auth-session";

function subscribeToAuthSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onStoreChange);
  };
}

function getAuthSessionSnapshot() {
  return getAuthSession() !== null;
}

function getServerAuthSessionSnapshot() {
  return false;
}

export function AuthBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authorized = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getServerAuthSessionSnapshot,
  );

  useEffect(() => {
    if (!authorized) {
      router.replace("/login");
    }
  }, [authorized, router]);

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
