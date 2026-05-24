import type { VctInscricaoStatus } from "@/lib/vct-inscricao-status";

export type ProjectStatus = "live" | "pilot" | "beta";
export type ProjectSsoMode = "none" | "shared-ticket";

export interface PortalProject {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  audience: string;
  tags: string[];
  icon: string;
  status: ProjectStatus;
  ssoMode: ProjectSsoMode;
  featured: boolean;
}

export interface PortalUserSummary {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt?: string;
}

export interface VctInscricaoSummary {
  _id: string;
  modalidade?: "valorant" | "counter-strike" | "lol";
  nome: string;
  nick: string;
  riotName?: string;
  riotTag?: string;
  riotPuuid?: string;
  valorantRegion?: string;
  valorantAccountLevel?: number | null;
  valorantCardSmall?: string;
  valorantCardWide?: string;
  valorantCurrentRank?: string;
  valorantPeakRank?: string;
  email: string;
  whatsapp: string;
  instagram: string;
  cidade?: string;
  elo: string;
  pico: string;
  funcaoPrimaria: string;
  funcaoSecundaria: string;
  diasTreino?: string;
  diasSemana?: string;
  horariosTreino?: string;
  melhorJanela?: string;
  compromisso?: string;
  rotinaFixa?: string;
  horariosDefinidos?: string;
  capitao?: string;
  presencial?: string;
  deslocamento?: string;
  autorizacaoContato?: string;
  tags?: string[];
  observacoes?: string;
  highlightColor?: string;
  status?: VctInscricaoStatus;
  time: number | null;
  createdAt?: string;
}

export interface VctTimeSummary {
  _id: string;
  modalidade?: "valorant" | "counter-strike" | "lol";
  numero: number;
  nome: string;
}

export interface VctFormacaoMembroSummary {
  _id: string;
  modalidade?: "valorant" | "counter-strike" | "lol";
  formacaoTimeId: string;
  ordem: number;
  papel: "capitao" | "jogador";
  nome: string;
  email: string;
  instagram: string;
  whatsapp: string;
  nick: string;
  eloAtual: string;
  peakRanking: string;
  createdAt?: string;
}

export interface VctFormacaoSummary {
  _id: string;
  modalidade?: "valorant" | "counter-strike" | "lol";
  nome: string;
  tag: string;
  logoKey: string;
  logoUrl: string;
  membroCount: number;
  membros: VctFormacaoMembroSummary[];
  createdAt?: string;
}

export type CheckoutOrderStatus = "pending" | "paid" | "failed" | "expired";

export interface CheckoutProductSummary {
  id: number;
  name: string;
  description: string;
  features: string[];
  amountCents: number;
  active: boolean;
  createdAt: string;
}

export interface CheckoutClienteSummary {
  id: number;
  userId: number;
  userLogin: string;
  userEmail: string | null;
  abacateCustomerId: string;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
  lastPaidProduct: string | null;
  purchasedProducts: string[];
  isVip: boolean;
}

export interface CheckoutClientePedido {
  id: number;
  userId: number;
  productId: string;
  description: string;
  amountCents: number;
  status: CheckoutOrderStatus;
  createdAt: string;
}

export interface CheckoutNovosPorMes {
  mes: string;
  total: number;
}

export interface CheckoutOrderSummary {
  id: number;
  userId: number;
  userLogin: string;
  description: string;
  amountCents: number;
  status: CheckoutOrderStatus;
  createdAt: string;
}

export interface CheckoutDashboardData {
  totalOrders: number;
  paidOrders: number;
  totalRevenueCents: number;
  totalClientes: number;
  ticketMedioCents: number;
  receitaHojeCents: number;
  receitaSemanaCents: number;
  pedidosHoje: number;
  recentOrders: CheckoutOrderSummary[];
  receitaPorProduto: { produto: string; receita: number; qtd: number }[];
  pedidosPorDia: { dia: string; total: number }[];
  statusBreakdown: { status: string; total: number }[];
}
