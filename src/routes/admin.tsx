import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { useMe } from "@/hooks/useSession";
import {
  adminBotPress,
  adminGrantPresses,
  adminOverview,
  adminSetRemaining,
  adminSettle,
  adminUpdateSeason,
} from "@/lib/game.functions";
import { formatClock, formatDuration, relativeTime, remainingMs } from "@/lib/game";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — The Last Person" },
      { name: "description", content: "Season management and game balancing for The Last Person." },
      { property: "og:title", content: "Admin — The Last Person" },
      { property: "og:description", content: "Season management console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border/60 bg-card/40 p-5">
      <h2 className="label-caps text-[10px] text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Admin() {
  const { isAdmin, ready, session } = useMe();
  const qc = useQueryClient();
  const [seconds, setSeconds] = useState(30);
  const [minutes, setMinutes] = useState(5);
  const [grantUser, setGrantUser] = useState("");
  const [grantN, setGrantN] = useState(10);

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminOverview(),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  if (!ready) return <Shell>Loading…</Shell>;
  if (!session || !isAdmin) return <Shell>You don't have access to this page.</Shell>;

  const active = data?.seasons.find((s) => s.status === "active");

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
      void qc.invalidateQueries({ queryKey: ["game"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Control room</h1>

        <div className="grid grid-cols-3 gap-4">
          {[
            { l: "Players", v: (data?.players ?? 0).toLocaleString() },
            { l: "Members", v: (data?.members ?? 0).toLocaleString() },
            {
              l: "Live clock",
              v: active ? formatClock(remainingMs(active.timer_expires_at)) : "—",
            },
          ].map((s) => (
            <div key={s.l} className="rounded-sm border border-border/60 bg-card/40 p-4">
              <div className="label-caps text-[10px] text-muted-foreground">{s.l}</div>
              <div className="mt-1 font-mono text-xl">{s.v}</div>
            </div>
          ))}
        </div>

        <Panel title="Demo controls">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="w-24 rounded-sm border border-input bg-background px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={() => void run(() => adminSetRemaining({ data: { seconds } }), "Clock moved.")}
              className="rounded-sm bg-primary px-4 py-2 label-caps text-[10px] text-primary-foreground"
            >
              Set remaining (s)
            </button>
            <button
              onClick={() => void run(() => adminBotPress(), "Bot pressed.")}
              className="rounded-sm border border-border px-4 py-2 label-caps text-[10px]"
            >
              Trigger bot press
            </button>
            <button
              onClick={() => void run(() => adminSettle(), "Seasons settled.")}
              className="rounded-sm border border-border px-4 py-2 label-caps text-[10px]"
            >
              Settle seasons
            </button>
          </div>
        </Panel>

        <Panel title="Balancing">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-24 rounded-sm border border-input bg-background px-3 py-2 font-mono text-sm"
            />
            <button
              disabled={!active}
              onClick={() =>
                void run(
                  () =>
                    adminUpdateSeason({
                      data: { seasonId: active!.id, duration_ms: minutes * 60000 },
                    }),
                  "Season duration updated.",
                )
              }
              className="rounded-sm bg-primary px-4 py-2 label-caps text-[10px] text-primary-foreground disabled:opacity-40"
            >
              Set season length (min)
            </button>
            <span className="font-mono text-xs text-muted-foreground">
              current {active ? formatDuration(active.duration_ms) : "—"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={grantUser}
              onChange={(e) => setGrantUser(e.target.value)}
              placeholder="username"
              className="w-40 rounded-sm border border-input bg-background px-3 py-2 font-mono text-sm"
            />
            <input
              type="number"
              value={grantN}
              onChange={(e) => setGrantN(Number(e.target.value))}
              className="w-20 rounded-sm border border-input bg-background px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={() =>
                void run(
                  () => adminGrantPresses({ data: { username: grantUser, presses: grantN } }),
                  "Presses granted.",
                )
              }
              className="rounded-sm border border-border px-4 py-2 label-caps text-[10px]"
            >
              Set presses
            </button>
          </div>
        </Panel>

        <Panel title="Seasons">
          <ul className="divide-y divide-border/50 font-mono text-sm">
            {data?.seasons.map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span>
                  S{s.season_number} · {s.status}
                </span>
                <span className="text-muted-foreground">
                  {formatDuration(s.duration_ms)} · {s.total_presses} presses
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent presses">
          <ul className="divide-y divide-border/50 font-mono text-sm">
            {data?.presses.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>{p.username}</span>
                <span className="text-muted-foreground">
                  {formatClock(Number(p.previous_timer_remaining_ms))} left ·{" "}
                  {relativeTime(p.pressed_at)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <p className="p-8 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
