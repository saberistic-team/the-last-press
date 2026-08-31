import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * After a successful Stripe checkout the user comes back with ?checkout=success.
 * The subscription row only exists once Stripe's webhook lands, so we show an
 * "activating" state and poll until it does (realtime covers the fast path).
 */
export function CheckoutReturn() {
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const { isActive } = useSubscription();
  const done = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.pathname + url.search);
    setPending(true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      if (Date.now() - started > 60_000) {
        setPending(false);
        toast.message("Payment received", {
          description: "Your membership is taking a moment to activate. Refresh in a minute.",
        });
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [pending, qc]);

  useEffect(() => {
    if (!pending || !isActive || done.current) return;
    done.current = true;
    setPending(false);
    toast.success("Membership active — 10 extra presses added.");
  }, [pending, isActive]);

  if (!pending) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-sm border border-primary/50 bg-card px-4 py-3 shadow-lg">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <p className="font-mono text-xs">Activating your membership…</p>
      </div>
    </div>
  );
}
