"use client";

import Link from "next/link";

import {
  CrosshairIcon,
  GameControllerIcon,
  MoonIcon,
  StorefrontIcon,
  StrategyIcon,
  SwordIcon,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

const GREETINGS = [
  (name: string) => `I aee ${name}, seja bem-vindo!`,
  (name: string) => `Opa ${name}, bom te ver por aqui!`,
  (name: string) => `Fala ${name}, tô aqui contigo!`,
  (name: string) => `E aí ${name}, bora trabalhar?`,
  (name: string) => `Ooh ${name}, legal que você está aqui!`,
  (name: string) => `Salve ${name}, o que vamos fazer hoje?`,
  (name: string) => `${name}! Bora meter a mão na massa?`,
  (name: string) => `Fala ${name}, tudo certo? Bora lá!`,
  (name: string) => `Bem-vindo de volta, ${name}!`,
  (name: string) => `${name}, a casa é sua. O que precisa?`,
  (name: string) => `Eae ${name}, mais um dia de conquista!`,
  (name: string) => `${name}, bom demais te ver aqui!`,
  (name: string) => `Opa ${name}, vamos fazer acontecer?`,
  (name: string) => `${name}! Tá na hora de voar!`,
  (name: string) => `Fala ${name}, o sistema tá pronto pra você!`,
  (name: string) => `E aí ${name}, preparado pra hoje?`,
  (name: string) => `Salve ${name}, bora crescer!`,
  (name: string) => `${name}, mais um round. Bora!`,
  (name: string) => `Opa ${name}, que bom que voltou!`,
  (name: string) => `Fala ${name}, tá tudo pronto aqui!`,
  (name: string) => `E aí ${name}, vamos dominar o dia?`,
  (name: string) => `${name}! Firme e forte, como sempre.`,
  (name: string) => `Opa ${name}, o painel é seu. Manda ver!`,
  (name: string) => `Fala ${name}, bora fechar mais um?`,
  (name: string) => `${name}, cheguei junto contigo!`,
  (name: string) => `Eae ${name}, vamos com tudo hoje?`,
  (name: string) => `Opa ${name}, missão do dia: arrasar!`,
  (name: string) => `${name}, que bom te ter aqui de novo!`,
  (name: string) => `Fala ${name}, hoje é dia de resultado!`,
  (name: string) => `${name}! Tamo junto, bora trabalhar!`,
];

type Shortcut = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const SHORTCUTS: Shortcut[] = [
  {
    href: "/corujao",
    label: "Corujão",
    description: "Tela de trabalho, leads e sessões",
    icon: MoonIcon,
  },
  {
    href: "/checkout",
    label: "Checkout",
    description: "Pagamentos, clientes e produtos",
    icon: StorefrontIcon,
  },
  {
    href: "/vct",
    label: "Valorant",
    description: "Inscrições e formações",
    icon: CrosshairIcon,
  },
  {
    href: "/counter-strike",
    label: "Counter-Strike",
    description: "Inscrições do CS",
    icon: SwordIcon,
  },
  {
    href: "/league-of-legends",
    label: "League of Legends",
    description: "Inscrições do LoL",
    icon: StrategyIcon,
  },
];

function getHourGreeting(): string {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomeWelcome({ username }: { username: string }) {
  const firstName = username.split(" ")[0] ?? username;

  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % GREETINGS.length;
  const greeting = GREETINGS[dayIndex]!(firstName);

  const hourGreeting = getHourGreeting();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{hourGreeting}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {greeting}
        </h1>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 mb-3">
          Acesso rápido
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:bg-card hover:border-border"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                <shortcut.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{shortcut.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {shortcut.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
