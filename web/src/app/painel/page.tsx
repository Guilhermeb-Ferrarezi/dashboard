import { headers } from "next/headers";

import { PainelClient } from "./painel-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PainelPage() {
  await headers();
  return <PainelClient />;
}
