import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VeriditLogo } from "@/components/layout/veridit-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { AuthBoundary } from "@/components/veridit/auth-boundary";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ActiveRoute = "dashboard" | "capture" | "credits" | "profile";

const navItems: Array<{
  href: string;
  label: string;
  active: ActiveRoute;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    active: "dashboard",
    description: "Registros, status e atividade",
    icon: LayoutDashboard,
  },
  {
    href: "/captura",
    label: "Nova Captura",
    active: "capture",
    description: "Registrar evidência web",
    icon: Video,
  },
  {
    href: "/creditos",
    label: "Créditos",
    active: "credits",
    description: "Planos e saldo disponível",
    icon: CreditCard,
  },
  {
    href: "/perfil",
    label: "Perfil",
    active: "profile",
    description: "Conta, segurança e preferências",
    icon: UserRound,
  },
];

const activeLabels: Record<ActiveRoute, string> = {
  dashboard: "Visão operacional",
  capture: "Nova evidência",
  credits: "Créditos e cobrança",
  profile: "Conta e segurança",
};

function NavigationList({
  active,
  compact = false,
}: {
  active: ActiveRoute;
  compact?: boolean;
}) {
  return (
    <nav className="grid gap-1" aria-label="Principal">
      {navItems.map((item) => {
        const Icon = item.icon;
        const selected = active === item.active;

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant={selected ? "default" : "ghost"}
                className={cn(
                  "h-12 justify-start rounded-xl px-3 text-left",
                  selected
                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgb(31_95_191/0.22)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  compact && "justify-center px-0",
                )}
              >
                <Link href={item.href} aria-current={selected ? "page" : undefined}>
                  <Icon aria-hidden="true" />
                  {compact ? null : (
                    <span className="grid leading-tight">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span
                        className={cn(
                          "text-xs",
                          selected ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  )}
                </Link>
              </Button>
            </TooltipTrigger>
            {compact ? <TooltipContent side="right">{item.label}</TooltipContent> : null}
          </Tooltip>
        );
      })}
    </nav>
  );
}

function SidebarNav({ active }: { active: ActiveRoute }) {
  return (
    <aside className="hidden min-h-dvh w-[288px] shrink-0 border-r bg-card/90 px-4 py-5 shadow-[8px_0_30px_rgb(15_23_42/0.04)] backdrop-blur xl:block">
      <div className="sticky top-5 flex h-[calc(100dvh-2.5rem)] flex-col">
        <VeriditLogo />
        <div className="mt-7">
          <NavigationList active={active} />
        </div>

        <div className="mt-6 rounded-2xl border bg-secondary/55 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 className="text-[color:var(--evidence)]" aria-hidden="true" />
            Cofre de evidências
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {currentUser.credits} créditos ativos para capturas com relatório e hash.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href="/captura">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Nova Captura
            </Link>
          </Button>
        </div>

        <div className="mt-auto rounded-2xl border bg-background/80 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-primary/20">
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {currentUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ active }: { active: ActiveRoute }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="xl:hidden" aria-label="Abrir menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[316px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação Veridit</SheetTitle>
          <SheetDescription>Menu principal do sistema Veridit.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-dvh">
          <div className="flex min-h-dvh flex-col gap-6 p-5">
            <VeriditLogo />
            <NavigationList active={active} />
            <Separator />
            <div className="rounded-2xl border bg-secondary/65 p-4">
              <p className="text-sm font-semibold">Saldo disponível</p>
              <p className="mt-1 text-2xl font-bold">{currentUser.credits} créditos</p>
              <Button asChild className="mt-4 w-full">
                <Link href="/captura">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Nova Captura
                </Link>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function ProductShell({
  active,
  children,
}: {
  active: ActiveRoute;
  children: ReactNode;
}) {
  return (
    <AuthBoundary>
      <div className="min-h-dvh bg-background text-foreground">
        <div className="flex min-h-dvh">
          <SidebarNav active={active} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b bg-background/[0.82] backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <MobileNav active={active} />
                  <div className="xl:hidden">
                    <VeriditLogo className="min-h-10 text-lg" />
                  </div>
                  <Badge variant="secondary" className="hidden rounded-full md:inline-flex">
                    <BookOpenCheck aria-hidden="true" />
                    {activeLabels[active]}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="hidden rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)] sm:inline-flex">
                    <ShieldCheck aria-hidden="true" />
                    {currentUser.credits} créditos
                  </Badge>
                  <UserMenu />
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthBoundary>
  );
}

export const AppShell = ProductShell;
