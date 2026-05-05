export interface VctInscricaoLike {
  _id?: unknown;
  elo: string;
  time: number | null;
  funcaoPrimaria?: string;
  funcaoSecundaria?: string;
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
}

export interface VctFormationFilters {
  sameTrainingDays: boolean;
  sameAvailability: boolean;
  confirmedTravelOnly: boolean;
  prioritizeCaptainIfMissing: boolean;
  singleCaptainPerTeam: boolean;
  maxEloPerTeam: string | null;
}

export interface VctTeamState {
  members: VctInscricaoLike[];
  memberCount: number;
  eloSum: number;
  vacancies: number;
}

export interface VctTeamCandidate extends VctTeamState {
  numero: number;
  filters: VctFormationFilters;
}

const AVAILABILITY_FIELDS = [
  "diasSemana",
  "horariosTreino",
  "melhorJanela",
  "compromisso",
  "rotinaFixa",
  "horariosDefinidos",
  "presencial",
] as const;

const CONFIRMATION_TOKENS = ["sim", "confirm", "ok", "true", "yes", "capit"];
const ELO_ORDER = [
  "Sem elo",
  "Ferro",
  "Ferro 1",
  "Ferro 2",
  "Ferro 3",
  "Bronze",
  "Bronze 1",
  "Bronze 2",
  "Bronze 3",
  "Prata",
  "Prata 1",
  "Prata 2",
  "Prata 3",
  "Ouro",
  "Ouro 1",
  "Ouro 2",
  "Ouro 3",
  "Platina",
  "Platina 1",
  "Platina 2",
  "Platina 3",
  "Diamante",
  "Diamante 1",
  "Diamante 2",
  "Diamante 3",
  "Ascendente",
  "Ascendente 1",
  "Ascendente 2",
  "Ascendente 3",
  "Imortal",
  "Imortal 1",
  "Imortal 2",
  "Imortal 3",
  "Radiante",
] as const;
const WEEKDAY_ALIASES = [
  ["segunda", ["segunda", "segunda feira"]],
  ["terca", ["terca", "terca feira"]],
  ["quarta", ["quarta", "quarta feira"]],
  ["quinta", ["quinta", "quinta feira"]],
  ["sexta", ["sexta", "sexta feira"]],
  ["sabado", ["sabado"]],
  ["domingo", ["domingo"]],
] as const;
const TEXT_STOPWORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "e",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "por",
  "para",
  "com",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "às",
  "as",
  "semana",
  "feira",
  "h",
]);

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeComparableText(value?: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenizeComparableText(value?: string) {
  return normalizeComparableText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !TEXT_STOPWORDS.has(token));
}

function jaccardSimilarity(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union > 0 ? intersection / union : 0;
}

function extractWeekdays(value?: string) {
  const normalized = normalizeComparableText(value);
  if (!normalized) return [];

  const weekdays = new Set<string>();
  for (const [key, aliases] of WEEKDAY_ALIASES) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      weekdays.add(key);
    }
  }

  return [...weekdays];
}

function isConfirmedText(value?: string) {
  const normalized = normalizeText(value);
  if (!normalized) return false;

  return CONFIRMATION_TOKENS.some((token) => normalized.includes(token));
}

function getReferenceValue(members: VctInscricaoLike[], field: keyof VctInscricaoLike) {
  const counts = new Map<string, number>();
  const order: string[] = [];

  for (const member of members) {
    const value = normalizeComparableText(member[field] as string | undefined);
    if (!value) continue;

    if (!counts.has(value)) order.push(value);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let bestValue = "";
  let bestCount = 0;

  for (const value of order) {
    const count = counts.get(value) ?? 0;
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  }

  return bestValue;
}

function getFieldSimilarity(
  candidateValue: string | undefined,
  referenceValue: string,
  field: keyof VctInscricaoLike,
) {
  if (!referenceValue) return 0;

  if (field === "diasTreino" || field === "diasSemana") {
    const candidateDays = extractWeekdays(candidateValue);
    const referenceDays = extractWeekdays(referenceValue);
    const weekdayScore = jaccardSimilarity(candidateDays, referenceDays);
    if (weekdayScore > 0) return weekdayScore;
  }

  return jaccardSimilarity(
    tokenizeComparableText(candidateValue),
    tokenizeComparableText(referenceValue),
  );
}

export function getFormationDetailScore(player: VctInscricaoLike) {
  let score = 0;

  if (normalizeComparableText(player.diasTreino)) score += 2;

  for (const field of AVAILABILITY_FIELDS) {
    if (normalizeComparableText(player[field] as string | undefined)) score += 1;
  }

  return score;
}

function isCaptain(member: VctInscricaoLike) {
  return isConfirmedText(member.capitao);
}

function getCaptainBonus(team: VctTeamState, candidate: VctInscricaoLike, prioritizeCaptainIfMissing: boolean) {
  if (!prioritizeCaptainIfMissing) return 0;
  if (team.members.some(isCaptain)) return 0;
  return isCaptain(candidate) ? 1 : 0;
}

function getEloCapScore(maxEloPerTeam: string | null) {
  if (!maxEloPerTeam) return null;
  if (!ELO_ORDER.includes(maxEloPerTeam as (typeof ELO_ORDER)[number])) return null;
  return getEloScore(maxEloPerTeam);
}

export function getEloScore(elo: string) {
  const normalized = normalizeText(elo);
  const index = ELO_ORDER.map((value) => normalizeComparableText(value)).indexOf(
    normalizeComparableText(elo),
  );
  return index >= 0 ? index : 0;
}

function getTeamAverage(team: VctTeamState) {
  return team.memberCount > 0 ? team.eloSum / team.memberCount : 0;
}

function filterEligibleCandidates(
  candidates: VctInscricaoLike[],
  team: VctTeamState,
  filters: VctFormationFilters,
) {
  const hasCaptain = team.members.some(isCaptain);
  const eloCapScore = getEloCapScore(filters.maxEloPerTeam);

  return candidates.filter((candidate) => {
    if (eloCapScore !== null && getEloScore(candidate.elo) > eloCapScore) return false;

    if (filters.confirmedTravelOnly && !isConfirmedText(candidate.deslocamento)) return false;

    if (filters.singleCaptainPerTeam && hasCaptain && isCaptain(candidate)) return false;

    return true;
  });
}

function getSoftMatchScore(candidate: VctInscricaoLike, team: VctTeamState, filters: VctFormationFilters) {
  let score = 0;

  if (filters.sameTrainingDays) {
    const reference = getReferenceValue(team.members, "diasTreino");
    if (reference) {
      score += getFieldSimilarity(candidate.diasTreino, reference, "diasTreino") * 1.5;
    } else {
      score += getFormationDetailScore(candidate) * 0.15;
    }
  }

  if (filters.sameAvailability) {
    const fieldScores = AVAILABILITY_FIELDS.map((field) => {
      const reference = getReferenceValue(team.members, field);
      if (!reference) return getFormationDetailScore(candidate) * 0.02;
      return getFieldSimilarity(candidate[field] as string | undefined, reference, field);
    }).filter((value) => value > 0);

    if (fieldScores.length > 0) {
      const average = fieldScores.reduce((acc, value) => acc + value, 0) / fieldScores.length;
      score += average * 1.25;
    }
  }

  return score;
}

function compareTeamsByBalance(a: VctTeamCandidate, b: VctTeamCandidate, playerScore: number) {
  if (a.memberCount > 0 && b.memberCount > 0) {
    const diffA = Math.abs(getTeamAverage(a) - playerScore);
    const diffB = Math.abs(getTeamAverage(b) - playerScore);
    if (diffA !== diffB) return diffA - diffB;
  } else if (a.memberCount !== b.memberCount) {
    return a.memberCount - b.memberCount;
  }

  if (a.vacancies !== b.vacancies) return b.vacancies - a.vacancies;

  return a.numero - b.numero;
}

export function pickBestTeamForPlayer(
  player: VctInscricaoLike,
  teams: VctTeamCandidate[],
) {
  const eligibleTeams = teams.filter((team) =>
    pickBestCandidateForTeam([player], team, team.filters) !== null,
  );

  if (eligibleTeams.length === 0) return null;

  const scoredTeams = eligibleTeams.map((team) => ({
    team,
    affinity: getSoftMatchScore(player, team, team.filters),
  }));
  const bestAffinity = Math.max(...scoredTeams.map((item) => item.affinity));
  const AFFINITY_MARGIN = 0.2;
  const affinityPool =
    bestAffinity > 0
      ? scoredTeams.filter((item) => bestAffinity - item.affinity <= AFFINITY_MARGIN)
      : scoredTeams;

  const playerScore = getEloScore(player.elo);
  return affinityPool
    .sort((a, b) => {
      if (bestAffinity > 0 && a.affinity !== b.affinity) return b.affinity - a.affinity;
      return compareTeamsByBalance(a.team, b.team, playerScore);
    })[0]?.team ?? null;
}

function compareCandidates(
  a: VctInscricaoLike,
  b: VctInscricaoLike,
  team: VctTeamState,
  filters: VctFormationFilters,
) {
  const softScoreA = getSoftMatchScore(a, team, filters);
  const softScoreB = getSoftMatchScore(b, team, filters);
  if (softScoreA !== softScoreB) return softScoreB - softScoreA;

  const captainDiff = getCaptainBonus(team, b, filters.prioritizeCaptainIfMissing) - getCaptainBonus(team, a, filters.prioritizeCaptainIfMissing);
  if (captainDiff !== 0) return captainDiff;

  if (team.memberCount > 0) {
    const avg = getTeamAverage(team);
    const distanceA = Math.abs(getEloScore(a.elo) - avg);
    const distanceB = Math.abs(getEloScore(b.elo) - avg);
    if (distanceA !== distanceB) return distanceA - distanceB;
  } else {
    const eloDiff = getEloScore(b.elo) - getEloScore(a.elo);
    if (eloDiff !== 0) return eloDiff;
  }

  const eloDiff = getEloScore(b.elo) - getEloScore(a.elo);
  if (eloDiff !== 0) return eloDiff;

  return String(a._id ?? "").localeCompare(String(b._id ?? ""));
}

export function pickBestCandidateForTeam(
  candidates: VctInscricaoLike[],
  team: VctTeamState,
  filters: VctFormationFilters,
) {
  const eligible = filterEligibleCandidates(candidates, team, filters);
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => compareCandidates(a, b, team, filters))[0] ?? null;
}

export function getFormationFiltersFromBody(body: unknown): VctFormationFilters {
  const input = (body ?? {}) as Partial<Record<keyof VctFormationFilters, unknown>>;

  return {
    sameTrainingDays: input.sameTrainingDays === true,
    sameAvailability: input.sameAvailability === true,
    confirmedTravelOnly: input.confirmedTravelOnly === true,
    prioritizeCaptainIfMissing: input.prioritizeCaptainIfMissing === true,
    singleCaptainPerTeam: input.singleCaptainPerTeam === true,
    maxEloPerTeam:
      typeof input.maxEloPerTeam === "string" && input.maxEloPerTeam.trim()
        ? input.maxEloPerTeam.trim()
        : null,
  };
}

export function getFormationFiltersByTeamFromBody(body: unknown) {
  const teamFilters = (body as { teamFilters?: unknown } | null)?.teamFilters;
  if (!teamFilters || typeof teamFilters !== "object") return {};

  const result: Record<number, VctFormationFilters> = {};
  for (const [key, value] of Object.entries(teamFilters as Record<string, unknown>)) {
    const numero = Number(key);
    if (!Number.isInteger(numero) || numero < 1) continue;
    result[numero] = getFormationFiltersFromBody(value);
  }

  return result;
}
