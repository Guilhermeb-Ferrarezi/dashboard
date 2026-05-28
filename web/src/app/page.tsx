import { ClientRedirect } from "@/components/navigation/client-redirect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function IndexPage() {
  return <ClientRedirect to="/home" label="home" />;
}
