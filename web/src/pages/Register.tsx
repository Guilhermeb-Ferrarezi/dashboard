import { register } from "../services/auth";
import { useState } from "react";
import {
  Home,
  FileText,
  Calendar,
  Briefcase,
  Users,
  Megaphone,
  IdCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "../styles/Dashboard.css";
import "../styles/customSelect.css";
import CustomSelect from "../components/customSelect";
import { useNavigate } from "react-router-dom";

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await register(username, password, role);
      setMessage("Usuário criado com sucesso!");
      setUsername("");
      setPassword("");
      setRole("user");
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
          <MenuItem icon={Home} label="Home" disponivel onClick={() => navigate("/Home")} />
          <MenuItem
            icon={IdCard}
            label="Criar usuário"
            active
            onClick={() => navigate("/register")}
          />
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

        <section className="registro">
          {/* USUÁRIO */}
          <input
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* SENHA */}
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* SELECT CUSTOM */}
          <CustomSelect
            placeholder="Tipo de usuário"
            options={[
              { label: "Usuário", value: "user" },
              { label: "Administrador", value: "admin" },
            ]}
            onChange={(value) => setRole(value as "user" | "admin")}
          />

          {/* BOTÃO */}
          <button onClick={handleRegister}>Criar</button>

          {message && <p>{message}</p>}
        </section>
      </main>
    </div>
  );
}

/* ================= MENU ================= */

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disponivel?: boolean
  onClick?: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  active = false,
  disponivel = false,
  onClick,
}: MenuItemProps) {
  return (
    <div
      className={`menu-item ${active ? "active" : ""}${disponivel ? "disponivel" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onClick) onClick();
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}
