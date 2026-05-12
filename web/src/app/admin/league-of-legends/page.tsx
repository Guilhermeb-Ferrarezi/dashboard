import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LeagueOfLegendsPage() {
  redirect("/league-of-legends");
}
