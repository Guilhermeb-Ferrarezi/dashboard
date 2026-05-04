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
  time: number | null;
  createdAt?: string;
}

export interface VctTimeSummary {
  _id: string;
  numero: number;
  nome: string;
}
