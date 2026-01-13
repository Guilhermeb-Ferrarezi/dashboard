import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import type { JSX } from "react/jsx-runtime";

/* =========================
   PROTECTED ROUTE
========================= */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/* =========================
   APP
========================= */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN (TELA INICIAL) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />


        {/* DASHBOARD PROTEGIDO */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
