import { motion } from "framer-motion";
import {
  Home,
  Zap,
  FileText,
  Calendar,
  Briefcase,
  Users,
  Megaphone,
  Trophy,
  Moon,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "../styles/Dashboard.css";

/* =========================
   COMPONENTE PRINCIPAL
========================= */

export default function Dashboard() {
  return (
    <div className="dashboard-root">
      <div className="dashboard-bg" />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <h1 className="logo">SANTOS TECH</h1>

        <nav className="menu">
          <MenuItem icon={Home} label="Dashboard" active />
          <MenuItem icon={Zap} label="Atalhos" />
          <MenuItem icon={FileText} label="Relatórios" />
          <MenuItem icon={Calendar} label="Agenda" />
          <MenuItem icon={Briefcase} label="Estágios / Vagas" />
          <MenuItem icon={Users} label="Clientes" />
          <MenuItem icon={Megaphone} label="Marketing" />
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main">
        <header className="header">
          <div>
            <span className="subtitle">Colaborador</span>
            <h2>Henrique</h2>
          </div>

          <input
            className="search"
            placeholder="Buscar função..."
          />
        </header>

        <section className="cards">
          <DashboardCard
            title="Jovem Tech"
            description="Dashboard geral • Acesso rápido"
            icon={<Zap />}
            color="red"
            onClick={() =>
              window.location.href =
                "https://banco-de-talentos.santos-tech.com/dashboard"
            }
          />

          <DashboardCard
            title="Corujão"
            description="Participantes, datas e automação"
            icon={<Moon />}
            color="blue"
            onClick={() =>
              window.location.href = "https://google.com"
            }
          />

          <DashboardCard
            title="Campeonatos"
            description="Competidores, organização e prêmios"
            icon={<Trophy />}
            color="green"
            onClick={() =>
              window.location.href = "https://google.com"
            }
          />

          <DashboardCard
            title="Locação e Mix"
            description="Reservas, grupos e fidelização"
            icon={<CalendarDays />}
            color="purple"
            onClick={() =>
              window.location.href = "https://google.com"
            }
          />
        </section>
      </main>
    </div>
  );
}

/* =========================
   MENU ITEM (SIDEBAR)
========================= */

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  active = false,
}: MenuItemProps) {
  return (
    <div className={`menu-item ${active ? "active" : ""}`}>
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}

/* =========================
   DASHBOARD CARD
========================= */

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "red" | "blue" | "green" | "purple";
  onClick: () => void;
}

function DashboardCard({
  title,
  description,
  icon,
  color,
  onClick,
}: DashboardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={`card ${color}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
    >
      <div className="card-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </motion.div>
  );
}
