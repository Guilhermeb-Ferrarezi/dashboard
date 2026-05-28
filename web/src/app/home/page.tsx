import { headers } from "next/headers";

import { HomeClient } from "./home-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomePage() {
  await headers();
  console.log("[/home v2] rendering HomePage stub at", new Date().toISOString());
  return <HomeClient />;
}
