import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { MembershipButton } from "@/components/MembershipButton";
import { formatDuration, DEFAULT_DURATION_MS } from "@/lib/game";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — The Last Person" },
      {
        name: "description",
        content:
          "The rules of The Last Person: one global countdown, ten presses a season, and a $1/month membership. Last person to press when the clock hits zero wins.",
      },
      { property: "og:title", content: "How The Last Person works" },
      {
        property: "og:description",
        content: "One global countdown. Every press resets it. Only the last person wins.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const rules = [
  {
    n: "01",
    t: "One clock for the whole world",
    d: "There is a single countdown shared by every player. It never runs in parallel and it never pauses.",
  },
  {
    n: "02",
    t: "Any press resets it to full",
    d: "The moment someone presses, the clock jumps back to the season's full duration for everyone, instantly.",
  },
  {
    n: "03",
    t: "If it reaches zero, the last presser wins",
    d: "The season ends and whoever pressed most recently is crowned The Last Person.",
  },
  {
    n: "04",
    t: "Presses are limited",
    d: "Free accounts get 1 press a month. Membership adds 10 more, for 11 total. When you're out, you can only watch.",
  },
  {
    n: "05",
    t: "The winner sets the next clock",
    d: `The champion moves the clock one step up, one step down, or keeps it — 1h, 3h, 6h, 12h, 1 day, 3 days, 1 week, 2 weeks, 1 month. Seasons start at ${formatDuration(DEFAULT_DURATION_MS)}.`,
  },
  {
    n: "06",
    t: "Inactivity gets purged",
    d: "Players who never press across a full season are removed from the active roster and must rejoin.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-6xl">
          The rules
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          It's one button. That's the whole game. The hard part is deciding when nobody else will press.
        </p>

        <ol className="mt-12 space-y-8">
          {rules.map((r) => (
            <li key={r.n} className="flex gap-5">
              <span className="font-mono text-sm text-primary">{r.n}</span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-tight">{r.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{r.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-16 rounded-sm border border-primary/40 bg-card/40 p-6">
          <div className="label-caps text-[10px] text-primary">Membership</div>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase">$1 / month</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· 10 extra presses every month (11 total)</li>
            <li>· Sniper mode and the full activity feed</li>
            <li>· A member badge on your public profile</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Watching, the live timer and every profile stay free forever.
          </p>
          <div className="mt-6">
            <MembershipButton />
          </div>
        </section>
      </main>
    </div>
  );
}
