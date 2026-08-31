import { getStripeEnvironmentSafe } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const env = getStripeEnvironmentSafe();

  if (env === null) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-1.5 text-center text-[11px] tracking-wide text-destructive">
        Checkout is not configured for this build yet.
      </div>
    );
  }
  if (env !== "sandbox") return null;

  return (
    <div className="w-full border-b border-border bg-muted px-4 py-1.5 text-center text-[11px] tracking-wide text-muted-foreground">
      All payments made in the preview are in test mode.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Read more
      </a>
    </div>
  );
}
