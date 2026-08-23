import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { MEMBERSHIP_PRICE_ID } from "@/lib/paddle";
import { cn } from "@/lib/utils";

export function MembershipButton({ className }: { className?: string }) {
  const { session } = useSession();
  const { isActive, isPastDue } = useSubscription();
  const { openCheckout, loading } = usePaddleCheckout();
  const navigate = useNavigate();

  const base = cn(
    "inline-block rounded-sm px-6 py-3 label-caps text-xs transition-colors disabled:opacity-60",
    className,
  );

  if (isActive && !isPastDue) {
    return (
      <div className={cn(base, "border border-primary/40 text-primary")}>Member · active</div>
    );
  }

  const onClick = async () => {
    if (!session) {
      void navigate({ to: "/auth" });
      return;
    }
    try {
      await openCheckout({
        priceId: MEMBERSHIP_PRICE_ID,
        customerEmail: session.user.email ?? undefined,
        customData: { userId: session.user.id },
        successUrl: `${window.location.origin}/?checkout=success`,
      });
    } catch {
      toast.error("Couldn't open checkout. Try again.");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(base, "bg-primary text-primary-foreground hover:bg-primary/90")}
    >
      {loading ? "Opening…" : isPastDue ? "Fix payment · $1/mo" : "Become a member · $1/mo"}
    </button>
  );
}
