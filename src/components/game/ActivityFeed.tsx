import { Link } from "@tanstack/react-router";
import { formatClock, relativeTime, type PressRow } from "@/lib/game";

export function ActivityFeed({ presses }: { presses: PressRow[] }) {
  if (presses.length === 0) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        Nobody has pressed this season yet. The clock is running.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {presses.map((p, i) => {
        const close = p.previous_timer_remaining_ms <= 60_000;
        return (
          <li
            key={p.id}
            className={`flex items-baseline justify-between gap-3 py-2.5 font-mono text-sm ${
              i === 0 ? "animate-rise" : ""
            }`}
          >
            <span className="truncate">
              <Link
                to="/players/$username"
                params={{ username: p.username }}
                className="text-foreground hover:text-primary"
              >
                {p.username}
              </Link>
              <span className="text-muted-foreground"> reset the clock</span>
            </span>
            <span className="shrink-0 text-xs">
              <span className={close ? "text-primary" : "text-muted-foreground"}>
                {formatClock(p.previous_timer_remaining_ms)} left
              </span>
              <span className="text-muted-foreground"> · {relativeTime(p.pressed_at)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
