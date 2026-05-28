/**
 * Utilitários centralizados de formatação (data, moeda).
 *
 * Substituem as funções locais duplicadas nos componentes.
 * Sempre usam locale "pt-BR".
 */

// ——— Data ————————————————————————————————————————————————————————————————————

/**
 * Formata data em "dd/mm/aaaa" (padrão numérico).
 * Aceita opções extras para sobrescrever o padrão.
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

/**
 * Formata data com mês abreviado: "27 de mai. de 2026".
 */
export function formatDateShort(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

/**
 * Formata data+hora: "dd/mm/aaaa, HH:mm".
 */
export function formatDateTime(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Formata data+hora com mês abreviado: "27 de mai. de 2026, 14:30".
 */
export function formatDateTimeShort(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

// ——— Moeda ———————————————————————————————————————————————————————————————————

/**
 * Formata valor em centavos para "R$ X.XXX,XX".
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
