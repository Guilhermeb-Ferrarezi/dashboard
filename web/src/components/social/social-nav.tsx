"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  LayoutDashboardIcon,
  Rows3Icon,
  ZapIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/social/resumo", label: "Resumo", icon: LayoutDashboardIcon },
  { href: "/social/calendario", label: "Calendário", icon: CalendarIcon },
  { href: "/social/kanban", label: "Kanban", icon: ZapIcon },
  { href: "/social/lista", label: "Lista", icon: Rows3Icon },
] as const;

export function SocialNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 border-b border-border/40 mb-6">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
            )}
          >
            <tab.icon className="size-3.5 shrink-0" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
