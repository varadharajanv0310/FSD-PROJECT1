import { SCORE_BANDS, scoreBand, type ScoreBand } from "@poise/shared";

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(iso));
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso, { day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Status colour token for a score band — always shown alongside its label. */
export const BAND_COLOR: Record<ScoreBand["tone"], string> = {
  excellent: "var(--color-good)",
  good: "var(--color-good)",
  fair: "var(--color-warning)",
  weak: "var(--color-serious)",
  low: "var(--color-critical)",
};

export function bandFor(score: number) {
  const band = scoreBand(score);
  return { ...band, color: BAND_COLOR[band.tone] };
}

export { SCORE_BANDS };

export function pluralize(count: number, word: string, plural = `${word}s`): string {
  return `${count} ${count === 1 ? word : plural}`;
}
