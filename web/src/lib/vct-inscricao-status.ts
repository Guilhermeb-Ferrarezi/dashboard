export const VCT_INSCRICAO_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type VctInscricaoStatus =
  (typeof VCT_INSCRICAO_STATUS)[keyof typeof VCT_INSCRICAO_STATUS];

export function isVctInscricaoInactive(status?: string) {
  return status === VCT_INSCRICAO_STATUS.INACTIVE;
}

export function getVctInscricaoStatusLabel(status?: string) {
  return isVctInscricaoInactive(status) ? "Fora do campeonato" : "Ativa";
}
