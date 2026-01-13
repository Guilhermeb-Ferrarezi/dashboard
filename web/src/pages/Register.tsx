import { useState } from "react";
import { register } from "../services/auth";
import "../styles/Dashboard.css"; // mantém o mesmo estilo

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    try {
      await register(username, password, role);
      setMessage("Usuário criado com sucesso!");
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-bg" />

      <aside className="sidebar">
        <h1 className="logo">SANTOS TECH</h1>
        <nav className="menu">
          <span style={{ marginBottom: 20, fontWeight: "bold" }}>Menu</span>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <h2>Criar Usuário</h2>
        </header>

        <section style={{ padding: 20, maxWidth: 400 }}>
          <input
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          >
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleRegister}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          >
            Criar
          </button>

          {message && <p>{message}</p>}
        </section>
      </main>
    </div>
  );
}