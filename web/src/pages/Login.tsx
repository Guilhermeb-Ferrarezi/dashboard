// src/pages/Login.tsx
import { useEffect, useRef, useState } from "react";
import type {FormEvent} from "react"
import { useNavigate } from "react-router-dom";
import { startMatrixRain } from "../utils/matrixrain";
import { login} from "../services/auth";
import "../styles/login-matrix.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [exiting, setExiting] = useState(false);

  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = startMatrixRain(canvasRef.current, {
      fontSize: 18,
      interval: 70,
      opacity: 0.04,
    });

    return () => controller.stop();
  }, []);

  /* =====================
     LOGIN
  ==================== */
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setCarregando(true);

    try {
      await login(username, password);
      setMessage("✅ Login feito com sucesso!");

      setExiting(true);
      setTimeout(() => navigate("/home"), 260);
    } catch (err: any) {
      setMessage(err.message || "❌ Erro no login");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="st-login-page">
      <canvas ref={canvasRef} className="st-matrix-canvas" />
      <div className="st-overlay" />

      <div className="st-login-shell">
        <div className={`st-card ${exiting ? "st-exit" : ""}`}>
          <div className="st-brand">
            <div className="st-logo" aria-label="Logo Santos Tech">
              <img src="/assets/logo.png" alt="Santos Tech" />
            </div>
            <div>
              <div className="st-title">Santos Tech</div>
              <div className="st-subtitle">Login</div>
            </div>
          </div>

          <form className="st-form">
            {/* Username */}
            <div className="st-field">
              <svg className="st-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7.5C4 6.12 5.12 5 6.5 5h11C19.88 5 21 6.12 21 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M6 7l6 5 6-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                className="st-input"
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="st-field">
              <svg className="st-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 10V8.2C7 5.88 8.79 4 11 4h2c2.21 0 4 1.88 4 4.2V10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M6.5 10h11C18.88 10 20 11.12 20 12.5v5C20 18.88 18.88 20 17.5 20h-11C5.12 20 4 18.88 4 17.5v-5C4 11.12 5.12 10 6.5 10Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>

              <input
                className="st-input"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {message && <div className="st-error">{message}</div>}

            <div className="st-buttons">
              <button className="st-btn" onClick={handleLogin} disabled={carregando || exiting}>
                {carregando ? "Entrando..." : "ENTRAR"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
