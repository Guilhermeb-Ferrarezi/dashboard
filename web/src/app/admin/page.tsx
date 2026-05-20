import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <ClientRedirect to="/admin/users" label="Admin users" />;
}
