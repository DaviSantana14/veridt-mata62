"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PaymentConfirmationClient() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const redirectTimeout = window.setTimeout(() => {
      router.push("/dashboard");
    }, 5000);
    const countdownInterval = window.setInterval(() => {
      setSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimeout);
      window.clearInterval(countdownInterval);
    };
  }, [router]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Redirecionando para o dashboard em {seconds} segundos.
      </p>
      <Button asChild className="w-fit">
        <Link href="/dashboard">
          <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
          Ir para dashboard
        </Link>
      </Button>
    </div>
  );
}
