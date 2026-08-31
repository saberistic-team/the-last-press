import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeCheckoutDialog } from "@/components/StripeCheckoutDialog";
import { MEMBERSHIP_PRICE_ID } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export function MembershipButton({ className }: { className?: string }) {
  const { session } = useSession();
  const { isActive, isPastDue } = useSubscription();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const base = cn(
    "inline-block rounded-sm px-6 py-3 label-caps text-xs transition-colors disabled:opacity-60",
    className,
  );

  if (isActive && !isPastDue) {
    return <div className={cn(base, "border border-primary/40 text-primary")}>Member · active</div>;
  }

  const onClick = () => {
    if (!session) {
      void navigate({ to: "/auth" });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "bg-primary text-primary-foreground hover:bg-primary/90")}
      >
        {isPastDue ? "Fix payment · $1/mo" : "Become a member · $1/mo"}
      </button>
      {open && session && (
        <StripeCheckoutDialog
          priceId={MEMBERSHIP_PRICE_ID}
          customerEmail={session.user.email ?? undefined}
          userId={session.user.id}
          returnUrl={`${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
