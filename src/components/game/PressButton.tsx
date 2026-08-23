import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatClock, type Intensity } from "@/lib/game";

type Props = {
  intensity: Intensity;
  remaining: number;
  signedIn: boolean;
  pressesRemaining: number;
  banned: boolean;
  busy: boolean;
  sniper: boolean;
  onSniperChange: (v: boolean) => void;
  onPress: () => void;
};

export function PressButton({
  intensity,
  remaining,
  signedIn,
  pressesRemaining,
  banned,
  busy,
  sniper,
  onSniperChange,
  onPress,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const hot = intensity === "critical" || intensity === "final" || intensity === "countdown";

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirming]);

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
          <Link
            to="/auth"
            className="relative size-44 flex items-center justify-center rounded-full bg-primary font-display text-lg font-bold uppercase tracking-widest text-primary-foreground shadow-[0_0_80px_-16px_var(--primary)] transition-all hover:scale-[1.02] active:scale-95 sm:size-52"
          >
            Join to press
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Spectating is free. Pressing needs an account.</p>
      </div>
    );
  }

  if (banned) {
    return <p className="font-mono text-sm text-destructive">Your account is suspended.</p>;
  }

  const empty = pressesRemaining <= 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {hot && !empty && (
          <span className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
        )}
        <button
          disabled={busy || empty}
          onClick={() => {
            if (empty) return;
            if (sniper || confirming) {
              setConfirming(false);
              onPress();
            } else {
              setConfirming(true);
            }
          }}
          className={`relative size-44 rounded-full font-display text-lg font-bold uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-52 ${
            confirming
              ? "bg-signal text-background shadow-[0_0_80px_-10px_var(--signal)]"
              : "bg-primary text-primary-foreground shadow-[0_0_80px_-16px_var(--primary)] hover:scale-[1.02]"
          }`}
        >
          {busy ? "…" : confirming ? "Confirm?" : empty ? "No presses" : "Press"}
        </button>
      </div>

      <div className="text-center">
        <div className="font-mono text-sm">
          {pressesRemaining} press{pressesRemaining === 1 ? "" : "es"} left
        </div>
        {confirming && (
          <div className="mt-1 text-xs text-signal">
            Resets the clock to full · tap again within 4s
          </div>
        )}
        {empty && (
          <Link to="/how-it-works" className="mt-1 block text-xs text-primary underline">
            Get 10 more for $1/month
          </Link>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[11px] label-caps text-muted-foreground">
        <input
          type="checkbox"
          checked={sniper}
          onChange={(e) => onSniperChange(e.target.checked)}
          className="size-3 accent-[var(--primary)]"
        />
        Sniper mode — no confirmation
        {hot && <span className="text-primary">· {formatClock(remaining)} left</span>}
      </label>
    </div>
  );
}
