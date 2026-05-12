import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/portal/app-shell";
import { requireAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CounterStrikePage() {
  const user = await requireAdminSession();

  return (
    <AppShell
      user={user}
      eyebrow="Counter-strike"
      title="Counter-strike"
      description="Espaco reservado para a administracao de Counter-strike."
    >
      <div className="grid gap-6">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Em construcao</CardTitle>
            <CardDescription>
              Esta area vai concentrar as rotinas e dados de Counter-strike.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A rota ja existe e o menu ja aponta para ela. Quando os dados do jogo
            entrarem no backend, esta tela pode receber os controles principais.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
