import { formatClock, type Intensity } from "@/lib/game";

const sizeByIntensity: Record<Intensity, string> = {
  calm: "text-[clamp(3.2rem,17vw,10rem)]",
  tense: "text-[clamp(3.4rem,18vw,11rem)]",
  warning: "text-[clamp(3.6rem,19vw,12rem)]",
  critical: "text-[clamp(4rem,21vw,13rem)]",
  final: "text-[clamp(4.5rem,24vw,15rem)]",
  countdown: "text-[clamp(5rem,26vw,16rem)]",
};

const colorByIntensity: Record<Intensity, string> = {
  calm: "text-foreground",
  tense: "text-foreground",
  warning: "text-signal",
  critical: "text-primary",
  final: "text-primary",
  countdown: "text-primary",
};

export function Countdown({
  ms,
  intensity,
  flash,
}: {
  ms: number;
  intensity: Intensity;
  flash?: boolean;
}) {
  const glow =
    intensity === "calm"
      ? "0 0 60px oklch(1 0 0 / 0.08)"
      : intensity === "tense"
        ? "0 0 60px oklch(0.78 0.19 88 / 0.15)"
        : "0 0 80px oklch(0.68 0.22 26 / 0.35)";

  return (
    <div
      className={`timer-digits leading-[0.85] ${sizeByIntensity[intensity]} ${colorByIntensity[intensity]} ${
        flash ? "animate-pop" : ""
      } ${intensity === "final" || intensity === "countdown" ? "animate-pulse" : ""}`}
      style={{ textShadow: glow }}
      aria-live="off"
    >
      {formatClock(ms)}
    </div>
  );
}
