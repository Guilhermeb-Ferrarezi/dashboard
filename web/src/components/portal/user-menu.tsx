"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AccountSettingsDialog } from "@/components/portal/account-settings-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientApi } from "@/lib/api";
import type { SessionUser } from "@/lib/session";

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleLogout() {
    try {
      await clientApi<{ message: string }>("/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel sair.",
      );
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/70 p-2 text-sidebar-accent-foreground ring-1 ring-sidebar-border group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center"
              />
            }
          >
            <Avatar className="size-8 border border-sidebar-border">
              <AvatarFallback>
                {user.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold">
                {user.username}
              </span>
              <span className="block truncate text-[0.68rem] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/70">
                {user.role}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={10}
            className="w-72 border border-border/70 p-0 shadow-xl"
          >
            <div className="relative overflow-hidden rounded-lg bg-popover">
              <div className="h-16 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_36%,transparent),color-mix(in_oklch,var(--sidebar)_88%,black))]" />
              <div className="px-4 pb-3">
                <Avatar className="-mt-8 size-14 border-4 border-popover">
                  <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                    {user.username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-3 space-y-1">
                  <p className="truncate text-base font-semibold">
                    {user.username}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <MailIcon className="size-3.5" />
                    {user.email ?? "sem-email@santos-tech.com"}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-primary">
                    <ShieldIcon className="size-3" />
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
              Configuracoes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
          <span className="sr-only">Configuracoes</span>
        </Button>
      </div>
      <AccountSettingsDialog
        user={user}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onLogout={handleLogout}
      />
    </>
  );
}
