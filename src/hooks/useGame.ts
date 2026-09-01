import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getServerTime, settleIfExpired } from "@/lib/game.functions";
import { remainingMs, setClockOffset, type PressRow, type SeasonRow } from "@/lib/game";

export type GameSnapshot = {
  current: SeasonRow | null;
  lastEnded: SeasonRow | null;
  presses: PressRow[];
  totalPlayers: number;
  armedPlayers: number;
  lastPresserName: string | null;
  winnerName: string | null;
};

async function fetchSnapshot(): Promise<GameSnapshot> {
  const [{ data: seasons }, { data: presses }, total, armed] = await Promise.all([
    supabase.from("seasons").select("*").order("season_number", { ascending: false }).limit(6),
    supabase.from("presses").select("*").order("pressed_at", { ascending: false }).limit(25),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gt("presses_remaining", 0),
  ]);

  const all = (seasons ?? []) as SeasonRow[];
  const current = all.find((s) => s.status === "active") ?? all.find((s) => s.status === "pending") ?? null;
  const lastEnded = all.find((s) => s.status === "ended") ?? null;

  const ids = [current?.last_presser_id, lastEnded?.winner_user_id].filter(Boolean) as string[];
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data } = await supabase.from("profiles").select("id, username").in("id", ids);
    names = Object.fromEntries((data ?? []).map((p) => [p.id, p.username]));
  }

  return {
    current,
    lastEnded,
    presses: ((presses ?? []) as PressRow[]).filter((p) => !current || p.season_id === current.id),
    totalPlayers: total.count ?? 0,
    armedPlayers: armed.count ?? 0,
    lastPresserName: current?.last_presser_id ? (names[current.last_presser_id] ?? null) : null,
    winnerName: lastEnded?.winner_user_id ? (names[lastEnded.winner_user_id] ?? null) : null,
  };
}

/** Live game state: polled + pushed over realtime, with a server clock sync. */
export function useGame() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["game"],
    queryFn: fetchSnapshot,
    refetchInterval: 15000,
    staleTime: 1000,
  });

  const instanceId = useId();

  useEffect(() => {
    void getServerTime().then((r) => setClockOffset(r.now));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`last-person-live-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "seasons" }, () => {
        void qc.invalidateQueries({ queryKey: ["game"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "presses" }, () => {
        void qc.invalidateQueries({ queryKey: ["game"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, instanceId]);

  // The moment the clock hits zero, ask the server to settle the season.
  // Idempotent: the server only ends a season whose timer has really expired.
  const current = query.data?.current;
  const expiresAt = current?.status === "active" ? current.timer_expires_at : null;
  useEffect(() => {
    if (!expiresAt) return;
    let cancelled = false;
    let timer: number | undefined;

    const attempt = async () => {
      if (cancelled) return;
      try {
        await settleIfExpired();
      } catch {
        /* retry below */
      }
      void qc.invalidateQueries({ queryKey: ["game"] });
      // Keep nudging every 4s in case a race left it unsettled.
      if (!cancelled) timer = window.setTimeout(attempt, 4000);
    };

    const wait = Math.max(0, remainingMs(expiresAt)) + 300;
    timer = window.setTimeout(attempt, wait);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [expiresAt, qc]);

  return query;
}

/** Ticks every frame-ish so the countdown is smooth without re-fetching. */
export function useTick(intervalMs = 250) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

/** Detects a new press arriving so the UI can celebrate it. */
export function useResetEvent(presses: PressRow[] | undefined) {
  const [event, setEvent] = useState<PressRow | null>(null);
  const seen = useRef<string | null>(null);
  const first = useRef(true);

  const latest = useMemo(() => presses?.[0] ?? null, [presses]);

  useEffect(() => {
    if (!latest) return;
    if (first.current) {
      first.current = false;
      seen.current = latest.id;
      return;
    }
    if (seen.current !== latest.id) {
      seen.current = latest.id;
      setEvent(latest);
      const id = window.setTimeout(() => setEvent(null), 3200);
      return () => window.clearTimeout(id);
    }
    return;
  }, [latest]);

  return event;
}
