export const VCT_INSCRICAO_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type VctInscricaoStatus =
  (typeof VCT_INSCRICAO_STATUS)[keyof typeof VCT_INSCRICAO_STATUS];

export function isVctInscricaoStatus(value: unknown): value is VctInscricaoStatus {
  return value === VCT_INSCRICAO_STATUS.ACTIVE || value === VCT_INSCRICAO_STATUS.INACTIVE;
}

export function normalizeVctInscricaoStatus(value: unknown): VctInscricaoStatus {
  return isVctInscricaoStatus(value) ? value : VCT_INSCRICAO_STATUS.ACTIVE;
}
