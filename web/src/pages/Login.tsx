// src/pages/Login.tsx
import { useState } from "react";
import { login, register } from "../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      await login(username, password);
      setMessage("Login feito com sucesso!");
      window.location.href = "/"; // redireciona pro dashboard
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleRegister = async () => {
    try {
      await register(username, password);
      setMessage("Conta criada com sucesso! Agora faça login.");
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h1>Login / Criar Conta</h1>
      <input
        placeholder="Usuário"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />
      <button onClick={handleLogin} style={{ width: "100%", marginBottom: 10 }}>
        Login
      </button>
      <button onClick={handleRegister} style={{ width: "100%" }}>
        Criar Conta
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
