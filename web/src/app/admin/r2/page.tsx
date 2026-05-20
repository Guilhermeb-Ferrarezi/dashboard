import { AppShell } from "@/components/portal/app-shell";
import { AdminR2UploadPanel } from "@/components/admin/admin-r2-upload-panel";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminR2Page() {
  const user = await getSessionUser();

  if (!user) {
    return <ClientRedirect to="/login" label="login" />;
  }

  if (user.role !== "admin") {
    return <ClientRedirect to="/home" label="dashboard" />;
  }

  return (
    <AppShell
      user={user}
      eyebrow="Administracao"
      title="R2"
      description="Envie imagens para o bucket e escolha o prefixo de armazenamento."
    >
      <AdminR2UploadPanel />
    </AppShell>
  );
}
