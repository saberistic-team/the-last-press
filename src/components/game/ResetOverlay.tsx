import type { PressRow } from "@/lib/game";
import { formatClock } from "@/lib/game";

export function ResetOverlay({ event }: { event: PressRow | null }) {
  if (!event) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="animate-flash absolute inset-0 bg-primary/25" />
      <div className="animate-pop relative text-center">
        <div className="label-caps text-xs text-primary">Clock reset</div>
        <div className="mt-1 font-mono text-3xl font-bold text-foreground sm:text-5xl">
          {event.username}
        </div>
        <div className="mt-1 font-mono text-sm text-muted-foreground">
          with {formatClock(event.previous_timer_remaining_ms)} to spare
        </div>
      </div>
    </div>
  );
}
