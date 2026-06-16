export type Platform =
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "Google Meu Negócio"
  | "Blog"
  | "Threads"
  | "X"
  | "LinkedIn";

export type ContentPillar =
  | "Educacional"
  | "Institucional"
  | "Captação"
  | "Prova Social"
  | "Bastidores"
  | "Tech no Mundo Real";

export type PostStatus =
  | "Planejado"
  | "Em produção"
  | "Em revisão"
  | "Aprovado"
  | "Agendado"
  | "Publicado"
  | "Arquivado";

export type Post = {
  id: string;
  title: string;
  platform: Platform;
  pillar: ContentPillar;
  status: PostStatus;
  scheduledDate: string; // "YYYY-MM-DD"
  caption?: string;
};

export const STATUS_ORDER: PostStatus[] = [
  "Planejado",
  "Em produção",
  "Em revisão",
  "Aprovado",
  "Agendado",
  "Publicado",
  "Arquivado",
];

export const PLATFORMS: Platform[] = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Google Meu Negócio",
  "Blog",
  "Threads",
  "X",
  "LinkedIn",
];

export const PILLARS: ContentPillar[] = [
  "Educacional",
  "Institucional",
  "Captação",
  "Prova Social",
  "Bastidores",
  "Tech no Mundo Real",
];

export const PLATFORM_COLORS: Record<Platform, string> = {
  Instagram: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Facebook: "bg-blue-600/15 text-blue-400 border-blue-600/20",
  TikTok: "bg-slate-400/15 text-slate-300 border-slate-400/20",
  "Google Meu Negócio": "bg-green-500/15 text-green-400 border-green-500/20",
  Blog: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Threads: "bg-zinc-400/15 text-zinc-300 border-zinc-400/20",
  X: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  LinkedIn: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
};

export const PLATFORM_DOT: Record<Platform, string> = {
  Instagram: "bg-pink-400",
  Facebook: "bg-blue-400",
  TikTok: "bg-slate-300",
  "Google Meu Negócio": "bg-green-400",
  Blog: "bg-amber-400",
  Threads: "bg-zinc-300",
  X: "bg-sky-400",
  LinkedIn: "bg-indigo-400",
};

export const STATUS_COLORS: Record<PostStatus, string> = {
  Planejado: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  "Em produção": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Em revisão": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Aprovado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Agendado: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  Publicado: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Arquivado: "bg-zinc-700/20 text-zinc-500 border-zinc-700/20",
};

export const PILLAR_COLORS: Record<ContentPillar, string> = {
  Educacional: "bg-blue-500/15 text-blue-400",
  Institucional: "bg-violet-500/15 text-violet-400",
  Captação: "bg-amber-500/15 text-amber-400",
  "Prova Social": "bg-emerald-500/15 text-emerald-400",
  Bastidores: "bg-pink-500/15 text-pink-400",
  "Tech no Mundo Real": "bg-cyan-500/15 text-cyan-400",
};

export const MOCK_POSTS: Post[] = [
  // Publicados — junho passado
  { id: "p1", title: "Como funciona o sistema de ranking Santos Tech", platform: "Instagram", pillar: "Educacional", status: "Publicado", scheduledDate: "2026-06-02" },
  { id: "p2", title: "Apresentação da equipe Santos Tech", platform: "LinkedIn", pillar: "Institucional", status: "Publicado", scheduledDate: "2026-06-03" },
  { id: "p3", title: "Resultados do torneio de Valorant — maio 2026", platform: "Facebook", pillar: "Prova Social", status: "Publicado", scheduledDate: "2026-06-06" },
  { id: "p4", title: "Bastidores: como preparamos o Corujão", platform: "TikTok", pillar: "Bastidores", status: "Publicado", scheduledDate: "2026-06-09" },
  { id: "p5", title: "5 razões para treinar com Santos Tech", platform: "Instagram", pillar: "Captação", status: "Publicado", scheduledDate: "2026-06-10" },
  { id: "p6", title: "Tech no Mundo Real: IA nos games", platform: "Blog", pillar: "Tech no Mundo Real", status: "Publicado", scheduledDate: "2026-06-12" },
  { id: "p7", title: "Review do patch mais recente — análise técnica", platform: "X", pillar: "Educacional", status: "Publicado", scheduledDate: "2026-06-13" },
  { id: "p8", title: "Thread de bastidores — semana 24", platform: "Threads", pillar: "Bastidores", status: "Publicado", scheduledDate: "2026-06-14" },

  // Em andamento — ao redor de hoje (16/06)
  { id: "p9", title: "Depoimento: aluno vai para primeira lan", platform: "Instagram", pillar: "Prova Social", status: "Em revisão", scheduledDate: "2026-06-17" },
  { id: "p10", title: "Santos Tech abre vagas para o Corujão de julho", platform: "Google Meu Negócio", pillar: "Captação", status: "Aprovado", scheduledDate: "2026-06-18" },
  { id: "p11", title: "Meta semanal da equipe — semana 25", platform: "Threads", pillar: "Bastidores", status: "Em produção", scheduledDate: "2026-06-19" },
  { id: "p12", title: "Parceria com escola de TI confirmada", platform: "LinkedIn", pillar: "Institucional", status: "Aprovado", scheduledDate: "2026-06-20" },
  { id: "p13", title: "Reel: treino tático ao vivo com o coach", platform: "Instagram", pillar: "Educacional", status: "Agendado", scheduledDate: "2026-06-21" },
  { id: "p14", title: "Guia definitivo de periféricos para FPS", platform: "Blog", pillar: "Tech no Mundo Real", status: "Agendado", scheduledDate: "2026-06-23" },
  { id: "p15", title: "Análise do meta atual — semana 25", platform: "X", pillar: "Educacional", status: "Em revisão", scheduledDate: "2026-06-24" },
  { id: "p16", title: "30 segundos explicando o Corujão", platform: "TikTok", pillar: "Captação", status: "Em produção", scheduledDate: "2026-06-25" },
  { id: "p17", title: "Sorteio de periférico patrocinado", platform: "Facebook", pillar: "Captação", status: "Aprovado", scheduledDate: "2026-06-26" },
  { id: "p18", title: "Carrossel — a história da Santos Tech", platform: "Instagram", pillar: "Institucional", status: "Planejado", scheduledDate: "2026-06-28" },
  { id: "p19", title: "Avaliações positivas dos alunos", platform: "Google Meu Negócio", pillar: "Prova Social", status: "Planejado", scheduledDate: "2026-06-30" },

  // Julho — todos planejados
  { id: "p20", title: "O que é flick shot e como treinar", platform: "Blog", pillar: "Educacional", status: "Planejado", scheduledDate: "2026-07-02" },
  { id: "p21", title: "Impacto da Santos Tech na formação jovem", platform: "LinkedIn", pillar: "Prova Social", status: "Planejado", scheduledDate: "2026-07-04" },
  { id: "p22", title: "Rotina de um coach de games", platform: "TikTok", pillar: "Bastidores", status: "Planejado", scheduledDate: "2026-07-07" },
  { id: "p23", title: "Vagas abertas — nova turma de julho", platform: "Instagram", pillar: "Captação", status: "Planejado", scheduledDate: "2026-07-09" },
  { id: "p24", title: "Bastidores da próxima sessão do Corujão", platform: "Threads", pillar: "Bastidores", status: "Planejado", scheduledDate: "2026-07-11" },
  { id: "p25", title: "Análise de setup profissional — o que realmente importa", platform: "Blog", pillar: "Tech no Mundo Real", status: "Planejado", scheduledDate: "2026-07-14" },
  { id: "p26", title: "Análise do patch 15.0 ao vivo", platform: "X", pillar: "Educacional", status: "Planejado", scheduledDate: "2026-07-16" },
  { id: "p27", title: "Atualização do horário de atendimento", platform: "Google Meu Negócio", pillar: "Institucional", status: "Planejado", scheduledDate: "2026-07-18" },
];
