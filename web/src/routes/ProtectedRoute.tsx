import { Navigate } from "react-router-dom";
import type { JSX } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { checkAuth } from "../services/auth";

interface Props {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const user = await checkAuth();
      if (cancelled) return;
      setAuthenticated(Boolean(user));
      setLoading(false);
    }

    validateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
