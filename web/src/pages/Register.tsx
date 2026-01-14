import { register } from "../services/auth";
import { useEffect, useState } from "react";
import {
  Home,
  Zap,
  FileText,
  Calendar,
  Briefcase,
  Users,
  Megaphone,
  IdCard
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "../styles/Dashboard.css";
import { getUserFromToken, getAdminArea, getUserArea } from "../services/auth";
import { useNavigate } from "react-router-dom";


export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [message, setMessage] = useState("");
  const navigate = useNavigate()

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
          <MenuItem icon={Home} label="Dashboard" active/>
          <MenuItem icon={IdCard} label="Criar usuário" active onClick={() => navigate("/register")}/>
          <MenuItem icon={FileText} label="Relatórios" />
          <MenuItem icon={Calendar} label="Agenda" />
          <MenuItem icon={Briefcase} label="Estágios / Vagas" />
          <MenuItem icon={Users} label="Clientes" />
          <MenuItem icon={Megaphone} label="Marketing" />
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

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void; // adiciona a função onClick
}

function MenuItem({ icon: Icon, label, active = false, onClick }: MenuItemProps) {
  return (
    <div
      className={`menu-item ${active ? "active" : ""}`}
      onClick={onClick}          // aqui chama a função passada
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" && onClick) onClick(); }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}