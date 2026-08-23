import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/TopNav";
import { formatClock, formatDuration, type SeasonRow } from "@/lib/game";

export const Route = createFileRoute("/seasons")({
  head: () => ({
    meta: [
      { title: "Hall of Last People — The Last Person" },
      {
        name: "description",
        content:
          "Every season of The Last Person: who let the clock run out, how many presses it took and how long each season lasted.",
      },
      { property: "og:title", content: "Hall of Last People" },
      { property: "og:description", content: "Every winner, every season, every near miss." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Seasons,
});

function Seasons() {
  const { data, isLoading } = useQuery({
    queryKey: ["seasons-all"],
    queryFn: async () => {
      const { data: seasons } = await supabase
        .from("seasons")
        .select("*")
        .order("season_number", { ascending: false });
      const rows = (seasons ?? []) as SeasonRow[];
      const ids = rows.map((s) => s.winner_user_id).filter(Boolean) as string[];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
        names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
      }
      return { rows, names };
    },
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Hall of Last People
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Everyone below outlasted a crowd that was actively trying to stop them.
        </p>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

        <ul className="mt-10 space-y-3">
          {data?.rows.map((s) => {
            const winner = s.winner_user_id ? data.names[s.winner_user_id] : null;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border/60 bg-card/40 px-4 py-4"
              >
                <div>
                  <div className="label-caps text-[10px] text-muted-foreground">
                    Season {s.season_number} · {formatDuration(s.duration_ms)} clock
                  </div>
                  <div className="mt-1 font-mono text-lg">
                    {winner ? (
                      <Link
                        to="/players/$username"
                        params={{ username: winner }}
                        className="text-[var(--gold)] hover:underline"
                      >
                        👑 {winner}
                      </Link>
                    ) : s.status === "active" ? (
                      <span className="text-primary">Running now</span>
                    ) : (
                      <span className="text-muted-foreground">Not started</span>
                    )}
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-muted-foreground">
                  <div>{s.total_presses.toLocaleString()} presses</div>
                  <div>
                    closest {s.closest_press_ms != null ? formatClock(s.closest_press_ms) : "—"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
