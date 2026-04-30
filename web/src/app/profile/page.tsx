import { AppShell } from "@/components/portal/app-shell";
import { AppearanceSettingsPanel } from "@/components/portal/appearance-settings-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireSession();

  return (
    <AppShell
      user={user}
      eyebrow="Conta"
      title="Perfil de acesso"
      description="Resumo da conta usada para entrar no home universal."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>
              Informacoes vindas da sessao atual do portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Usuario</p>
              <p className="text-lg font-medium">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-mono text-sm">{user.email ?? "Nao cadastrado"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{user.role}</Badge>
              <Badge variant="secondary">Cookie + JWT</Badge>
            </div>
          </CardContent>
        </Card>
        <AppearanceSettingsPanel preferences={user.preferences} />
      </div>
    </AppShell>
  );
}
