"use client";

import { useEffect, useState } from "react";

import { AUTH_SESSION_CHANGED_EVENT, getAuthSession } from "@/lib/auth-session";
import { getUserCreditBalance } from "@/lib/gateway";

type BalanceState = {
  credits: number | null;
  loading: boolean;
};

export function useUserCreditBalance() {
  const [balance, setBalance] = useState<BalanceState>({
    credits: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      const session = getAuthSession();

      if (!session) {
        setBalance({
          credits: null,
          loading: false,
        });
        return;
      }

      setBalance((current) => ({
        credits: current.credits,
        loading: true,
      }));

      const result = await getUserCreditBalance(session.user.id);

      if (cancelled) {
        return;
      }

      setBalance({
        credits: result.ok ? result.data.credits : null,
        loading: false,
      });
    }

    loadBalance();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, loadBalance);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, loadBalance);
    };
  }, []);

  return balance;
}

export function CreditBalanceText({
  suffix = "créditos",
}: {
  suffix?: string;
}) {
  const { credits, loading } = useUserCreditBalance();
  const value = loading && credits === null ? "..." : (credits ?? 0);

  return (
    <>
      {value} {suffix}
    </>
  );
}
