"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/portal/app-shell";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { HomeWelcome } from "@/components/portal/home-welcome";
import { Spinner } from "@/components/ui/spinner";
import { clientApi } from "@/lib/api";
import { getAuthLoginUrl } from "@/lib/auth-api";
import type { SessionUser } from "@/lib/session";

type State =
  | { status: "loading" }
  | { status: "unauth" }
  | { status: "ok"; user: SessionUser };

export function PainelClient() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    clientApi<{ user: SessionUser }>("/user/me")
      .then((data) => {
        if (!alive) return;
        if (data?.user?.id) {
          setState({ status: "ok", user: data.user });
        } else {
          setState({ status: "unauth" });
        }
      })
      .catch(() => {
        if (!alive) return;
        setState({ status: "unauth" });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner size="lg" label="Carregando..." />
      </div>
    );
  }

  if (state.status === "unauth") {
    if (typeof window !== "undefined") {
      window.location.href = getAuthLoginUrl();
    }
    return <ClientRedirect to="/login" label="login" />;
  }

  return (
    <AppShell user={state.user} title="Home" description="">
      <HomeWelcome username={state.user.username} />
    </AppShell>
  );
}
