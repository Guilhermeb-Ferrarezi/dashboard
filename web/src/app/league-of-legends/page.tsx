import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";

export default function LeagueOfLegendsPage() {
  return <ClientRedirect to="/league-of-legends/inscricoes" label="League of Legends" />;
}
