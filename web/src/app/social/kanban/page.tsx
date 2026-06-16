import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { SocialKanban } from "@/components/social/social-kanban";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SocialKanbanPage() {
  const user = await getSessionUser();
  if (!user) return <ClientRedirect to="/login" label="login" />;

  return (
    <AppShell
      user={user}
      eyebrow="Social"
      title="Kanban"
      description="Posts organizados por status do fluxo editorial."
    >
      <SocialKanban />
    </AppShell>
  );
}
