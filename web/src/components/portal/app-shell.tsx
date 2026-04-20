"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  CrosshairIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  SparklesIcon,
  UserCircle2Icon,
} from "lucide-react";

import { UserMenu } from "@/components/portal/user-menu";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

const navigation = [
  { href: "/home", label: "Launcher", icon: LayoutDashboardIcon },
  { href: "/profile", label: "Perfil", icon: UserCircle2Icon },
];

const adminNavigation = [
  { href: "/admin/users", label: "Usuarios", icon: ShieldIcon },
  {
    href: "/admin/vct-inscricoes",
    label: "VCT Inscricoes",
    icon: CrosshairIcon,
  },
];

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
}

export function AppShell({
  user,
  children,
  title,
  description,
  eyebrow,
}: AppShellProps) {
  const pathname = usePathname();
  const isAdminSection = pathname.startsWith("/admin");

  return (
    <SidebarProvider>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-primary/10 p-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <SparklesIcon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">
                Santos Tech
              </span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                Universal Home
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegacao</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {user.role === "admin" ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isAdminSection}
                      tooltip="Administracao"
                    >
                      <BadgeCheckIcon />
                      <span>Administracao</span>
                      <ChevronRightIcon
                        className={cn(
                          "ml-auto size-4 transition-transform",
                          isAdminSection && "rotate-90",
                        )}
                      />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {adminNavigation.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            render={<Link href={item.href} />}
                            isActive={pathname === item.href}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 md:px-6">
              <SidebarTrigger />
              <div className="flex min-w-0 flex-1 flex-col">
                {eyebrow ? (
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    {eyebrow}
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
                  <Badge variant="secondary">{user.role.toUpperCase()}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Perfil
              </Link>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
