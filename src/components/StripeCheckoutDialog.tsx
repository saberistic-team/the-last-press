import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

type Props = {
  priceId: string;
  customerEmail?: string | undefined;
  userId?: string | undefined;
  returnUrl?: string | undefined;
  onClose: () => void;
};

/** Full-screen overlay hosting Stripe's embedded checkout form. */
export function StripeCheckoutDialog({
  priceId,
  customerEmail,
  userId,
  returnUrl,
  onClose,
}: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        customerEmail,
        userId,
        returnUrl: returnUrl || `${window.location.origin}/?checkout=success`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="label-caps text-[10px] text-muted-foreground">Membership · $1 / month</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border px-3 py-1.5 label-caps text-[10px]"
          >
            Close
          </button>
        </div>
        <div id="checkout" className="rounded-sm bg-card p-2">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
