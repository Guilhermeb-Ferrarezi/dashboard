import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/home");
  }

  redirect("/login");
}
