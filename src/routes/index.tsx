import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { Countdown } from "@/components/game/Countdown";
import { PressButton } from "@/components/game/PressButton";
import { ActivityFeed } from "@/components/game/ActivityFeed";
import { ResetOverlay } from "@/components/game/ResetOverlay";
import { useGame, useResetEvent, useTick } from "@/hooks/useGame";
import { useMe } from "@/hooks/useSession";
import { chooseNextDuration, pressButton } from "@/lib/game.functions";
import {
  formatDuration,
  intensityFor,
  relativeTime,
  remainingMs,
  nextDurationMs,
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  DEFAULT_DURATION_MS,
} from "@/lib/game";
import { sfx } from "@/lib/feedback";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Last Person — One button. One global timer." },
      {
        name: "description",
        content:
          "Thousands of players, one countdown. Every press resets the clock for everyone. If it ever hits zero, the last person to press wins the season.",
      },
      { property: "og:title", content: "The Last Person — One button. One global timer." },
      {
        property: "og:description",
        content: "Every press resets the clock. If it hits zero, the last person to press wins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Live,
});

function Live() {
  useTick(200);
  const { data } = useGame();
  const { session, profile, refetch } = useMe();
  const qc = useQueryClient();
  const event = useResetEvent(data?.presses);
  const [busy, setBusy] = useState(false);
  const [sniper, setSniper] = useState(false);
  const lastTick = useRef(-1);

  const season = data?.current ?? null;
  const duration = season?.duration_ms ?? DEFAULT_DURATION_MS;
  const remaining = season?.status === "active" ? remainingMs(season.timer_expires_at) : 0;
  const intensity = intensityFor(remaining, duration);

  useEffect(() => {
    if (event) sfx.reset();
  }, [event]);

  // Final-ten heartbeat
  useEffect(() => {
    if (season?.status !== "active") return;
    const secs = Math.ceil(remaining / 1000);
    if (secs <= 10 && secs > 0 && secs !== lastTick.current) {
      lastTick.current = secs;
      sfx.tick();
    }
  }, [remaining, season?.status]);

  async function press() {
    setBusy(true);
    try {
      const res = await pressButton();
      if (!res.ok) {
        toast.error(res.error ?? "Press rejected.");
      } else {
        sfx.press();
        void refetch();
      }
      void qc.invalidateQueries({ queryKey: ["game"] });
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const bgByIntensity: Record<string, string> = {
    calm: "",
    tense: "",
    warning: "bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.19_88/0.10),transparent_60%)]",
    critical: "bg-[radial-gradient(ellipse_at_top,oklch(0.68_0.22_26/0.16),transparent_60%)]",
    final: "bg-[radial-gradient(ellipse_at_top,oklch(0.68_0.22_26/0.22),transparent_65%)]",
    countdown: "bg-[radial-gradient(ellipse_at_top,oklch(0.68_0.22_26/0.30),transparent_70%)]",
  };

  const pending = season?.status === "pending";
  const winner = data?.lastEnded;
  const iWon = !!winner && !!session && winner.winner_user_id === session.user.id;

  return (
    <div className={`min-h-screen ${bgByIntensity[intensity] ?? ""}`}>
      <TopNav />
      <ResetOverlay event={event} />

      <main className="mx-auto max-w-5xl px-4 pb-24">
        {winner && (pending || !season) && (
          <section className="animate-rise mt-8 rounded-sm border border-[var(--gold)]/40 bg-card/60 p-6 text-center">
            <div className="label-caps text-[10px] text-[var(--gold)]">
              Season {winner.season_number} is over
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase text-[var(--gold)]">
              👑 {data?.winnerName ?? "Unknown"} was the last person
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {winner.total_presses.toLocaleString()} presses failed to save the rest.
            </p>
            {iWon && !winner.next_duration_choice && (
              <NextDurationPicker current={winner.duration_ms} />
            )}
          </section>
        )}

        <section className="flex flex-col items-center pt-10 text-center sm:pt-16">
          <div className="label-caps text-[10px] text-muted-foreground">
            {season ? (
              <>
                Season {season.season_number} · {formatDuration(duration)} clock ·{" "}
                {pending ? "waiting for first press" : "live"}
              </>
            ) : (
              "Preparing next season"
            )}
          </div>

          <div className="mt-5">
            <Countdown
              ms={pending ? duration : remaining}
              intensity={pending ? "calm" : intensity}
              flash={!!event}
            />
          </div>

          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {pending
              ? "The first press starts the season."
              : remaining <= 0
                ? "Time's up. Settling the season…"
                : data?.lastPresserName
                  ? `Last reset by ${data.lastPresserName}, ${relativeTime(season?.last_press_at)}.`
                  : "No one has pressed yet this season."}
          </p>

          <div className="mt-10">
            <PressButton
              intensity={intensity}
              remaining={remaining}
              signedIn={!!session && !!profile}
              pressesRemaining={profile?.presses_remaining ?? 0}
              banned={profile?.banned ?? false}
              busy={busy}
              sniper={sniper}
              onSniperChange={setSniper}
              onPress={() => void press()}
            />
          </div>

          <dl className="mt-12 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-border/60 pt-6 text-center">
            <div>
              <dt className="label-caps text-[10px] text-muted-foreground">Players</dt>
              <dd className="mt-1 font-mono text-lg">{(data?.totalPlayers ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="label-caps text-[10px] text-muted-foreground">Still armed</dt>
              <dd className="mt-1 font-mono text-lg text-signal">
                {(data?.armedPlayers ?? 0).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="label-caps text-[10px] text-muted-foreground">Presses</dt>
              <dd className="mt-1 font-mono text-lg">
                {(season?.total_presses ?? 0).toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="label-caps text-xs text-muted-foreground">Live activity</h2>
            <Link to="/seasons" className="label-caps text-[10px] text-primary">
              Hall of last people →
            </Link>
          </div>
          <div className="mt-3 rounded-sm border border-border/60 bg-card/40 px-4">
            <ActivityFeed presses={data?.presses ?? []} />
          </div>
        </section>
      </main>
    </div>
  );
}

function NextDurationPicker({ current }: { current: number }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function choose(choice: "double" | "half" | "keep") {
    setBusy(true);
    const res = await chooseNextDuration({ data: { choice } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Next season set.");
    void qc.invalidateQueries({ queryKey: ["game"] });
  }

  const options: Array<{ key: "double" | "half" | "keep"; label: string }> = [
    { key: "half", label: "One step shorter" },
    { key: "keep", label: "Keep it" },
    { key: "double", label: "One step longer" },
  ];

  return (
    <div className="mt-6">
      <p className="label-caps text-[10px] text-muted-foreground">
        You won. Move the next season's clock one step ({formatDuration(MIN_DURATION_MS)} –{" "}
        {formatDuration(MAX_DURATION_MS)})
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={busy}
            onClick={() => void choose(o.key)}
            className="rounded-sm border border-[var(--gold)]/50 px-4 py-2 font-mono text-sm text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/10 disabled:opacity-50"
          >
            {o.label} · {formatDuration(nextDurationMs(current, o.key))}
          </button>
        ))}
      </div>
    </div>
  );
}
