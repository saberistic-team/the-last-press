import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/TopNav";
import { formatClock, relativeTime } from "@/lib/game";

export const Route = createFileRoute("/players/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — The Last Person` },
      {
        name: "description",
        content: `Career record for ${params.username} in The Last Person: seasons played, total presses and closest reset.`,
      },
      { property: "og:title", content: `${params.username} — The Last Person` },
      { property: "og:description", content: `See how close ${params.username} has cut it.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerPage,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t border-border/60 py-3">
      <div className="label-caps text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg">{value}</div>
    </div>
  );
}

function PlayerPage() {
  const { username } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["player", username],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .maybeSingle();
      if (!profile) return null;

      const [{ data: presses }, { data: entries }, { data: wins }] = await Promise.all([
        supabase
          .from("presses")
          .select("*")
          .eq("user_id", profile.id)
          .order("pressed_at", { ascending: false }),
        supabase
          .from("season_players")
          .select("*, seasons(season_number, status, ended_at)")
          .eq("user_id", profile.id),
        supabase.from("seasons").select("season_number").eq("winner_user_id", profile.id),
      ]);

      const list = presses ?? [];
      const closest = list.length
        ? Math.min(...list.map((p) => Number(p.previous_timer_remaining_ms)).filter((n) => n > 0))
        : null;
      const avg = list.length
        ? list.reduce((a, p) => a + Number(p.previous_timer_remaining_ms), 0) / list.length
        : null;

      return { profile, presses: list, entries: entries ?? [], wins: wins ?? [], closest, avg };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <p className="p-8 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-4xl font-bold uppercase">No such player</h1>
          <Link to="/" className="mt-4 inline-block text-sm text-primary">
            Back to the timer
          </Link>
        </main>
      </div>
    );
  }

  const { profile, presses, entries, wins, closest, avg } = data;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-mono text-4xl font-bold sm:text-5xl">{profile.username}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Playing since Season {profile.first_season ?? "—"} · joined {relativeTime(profile.created_at)}
          {profile.is_member ? " · member" : ""}
        </p>

        {wins.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {wins.map((w) => (
              <span
                key={w.season_number}
                className="rounded-sm border border-[var(--gold)]/50 px-2 py-1 font-mono text-xs text-[var(--gold)]"
              >
                👑 S{w.season_number}
              </span>
            ))}
          </div>
        )}

        <section className="mt-10 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
          <Stat label="Seasons played" value={entries.length} />
          <Stat label="Total presses" value={presses.length} />
          <Stat label="Times last person" value={presses.length} />
          <Stat label="Closest press" value={closest != null ? formatClock(closest) : "—"} />
          <Stat label="Average press time" value={avg != null ? formatClock(avg) : "—"} />
          <Stat label="Best finish" value={wins.length ? "#1" : entries.length ? "—" : "—"} />
        </section>

        <section className="mt-12">
          <h2 className="label-caps text-xs text-muted-foreground">Seasons</h2>
          <ul className="mt-3 divide-y divide-border/60">
            {entries.map((e) => {
              const s = e.seasons as unknown as { season_number: number; status: string } | null;
              const won = wins.some((w) => w.season_number === s?.season_number);
              return (
                <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-mono">Season {s?.season_number}</span>
                  <span className={won ? "text-[var(--gold)]" : "text-muted-foreground"}>
                    {won ? "👑 WINNER" : s?.status === "active" ? "ACTIVE" : `${e.presses_used} presses`}
                  </span>
                </li>
              );
            })}
            {entries.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Hasn't pressed yet.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
