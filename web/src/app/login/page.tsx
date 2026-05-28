"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthLoginUrl } from "@/lib/auth-api";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");

  useEffect(() => {
    if (denied) {
      window.location.href = "https://santos-games.com";
    } else {
      window.location.href = getAuthLoginUrl();
    }
  }, [denied]);

  return null;
}
