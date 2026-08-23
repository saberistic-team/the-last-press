const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The only clock lengths a season can run at. */
export const DURATION_BUCKETS = [
  1 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  1 * DAY,
  3 * DAY,
  7 * DAY,
  14 * DAY,
  30 * DAY,
] as const;

export const DEFAULT_DURATION_MS = 1 * DAY;
export const MIN_DURATION_MS = DURATION_BUCKETS[0];
export const MAX_DURATION_MS = DURATION_BUCKETS[DURATION_BUCKETS.length - 1]!;

/** Index of the closest bucket to a given duration. */
export function bucketIndex(ms: number) {
  let best = 0;
  for (let i = 1; i < DURATION_BUCKETS.length; i++) {
    if (Math.abs(DURATION_BUCKETS[i]! - ms) < Math.abs(DURATION_BUCKETS[best]! - ms)) best = i;
  }
  return best;
}

export type SeasonRow = {
  id: string;
  season_number: number;
  status: string;
  duration_ms: number;
  timer_expires_at: string | null;
  last_press_at: string | null;
  last_presser_id: string | null;
  winner_user_id: string | null;
  next_duration_choice: string | null;
  total_presses: number;
  closest_press_ms: number | null;
  started_at: string | null;
  ended_at: string | null;
};

export type PressRow = {
  id: string;
  season_id: string;
  user_id: string;
  username: string;
  pressed_at: string;
  previous_timer_remaining_ms: number;
  new_expiration_at: string;
};

export type ProfileRow = {
  id: string;
  username: string;
  is_member: boolean;
  presses_remaining: number;
  banned: boolean;
  first_season: number | null;
  created_at: string;
};

/** Server clock offset (ms) — server time = Date.now() + offset. */
let clockOffset = 0;
export function setClockOffset(serverNowIso: string) {
  clockOffset = new Date(serverNowIso).getTime() - Date.now();
}
export function serverNow() {
  return Date.now() + clockOffset;
}

export function remainingMs(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  return Math.max(0, new Date(expiresAt).getTime() - serverNow());
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}:${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDuration(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 24) return Number.isInteger(hours) ? `${hours}h` : `${Math.floor(hours)}h ${mins % 60}m`;
  const days = Math.round(hours / 24);
  if (days === 30) return "1 month";
  if (days % 7 === 0) return days === 7 ? "1 week" : `${days / 7} weeks`;
  return days === 1 ? "1 day" : `${days} days`;
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "never";
  const diff = Math.max(0, serverNow() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

/** Winner moves the clock one bucket up, one down, or keeps it. */
export function nextDurationMs(current: number, choice: "double" | "half" | "keep") {
  const i = bucketIndex(current);
  const step = choice === "double" ? 1 : choice === "half" ? -1 : 0;
  const next = Math.min(DURATION_BUCKETS.length - 1, Math.max(0, i + step));
  return DURATION_BUCKETS[next]!;
}

export type Intensity = "calm" | "tense" | "warning" | "critical" | "final" | "countdown";

/** Intensity is relative to the season length so a 5-minute season is dramatic too. */
export function intensityFor(remaining: number, duration: number): Intensity {
  if (remaining <= 10_000) return "countdown";
  if (remaining <= 60_000) return "final";
  const frac = duration > 0 ? remaining / duration : 1;
  if (remaining <= Math.max(600_000, duration * 0.02)) return "critical";
  if (frac <= 0.05) return "warning";
  if (frac <= 0.25) return "tense";
  return "calm";
}

export function usernameSlug(name: string) {
  return name.trim().toLowerCase();
}

export function validateUsername(name: string): string | null {
  const v = name.trim();
  if (v.length < 3) return "At least 3 characters.";
  if (v.length > 20) return "20 characters max.";
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Letters, numbers and underscores only.";
  return null;
}
