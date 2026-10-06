const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("fr-FR");

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return dateFormatter.format(new Date(date));
}

/** 1284 → "1 284" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count > 1 ? pluralForm : singular}`;
}

/** Nom affiché de chaque source d'import (à compléter avec Claude, Gemini…). */
export const SOURCE_LABELS: Record<string, string> = { CHATGPT: "ChatGPT" };
