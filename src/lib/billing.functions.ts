import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeEnv } from "@/lib/stripe.server";

type Env = StripeEnv;

export type Invoice = {
  id: string;
  number: string | null;
  at: string | null;
  total: string | null;
  currency: string | null;
  url: string | null;
};

const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function formatAmount(amount: number | null | undefined, currency: string): string {
  const value = amount ?? 0;
  const major = ZERO_DECIMAL.has(currency.toLowerCase()) ? value : value / 100;
  return major.toFixed(ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2);
}

async function loadSubscription(userId: string, environment: Env) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Subscription row plus the customer's recent invoices, for the account page. */
export const getBillingSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { subscription: null, invoices: [] as Invoice[] };

    let invoices: Invoice[] = [];
    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const list = await stripe.invoices.list({
        customer: sub.stripe_customer_id,
        limit: 10,
      });
      invoices = list.data.map((inv) => ({
        id: inv.id ?? "",
        number: inv.number ?? null,
        at: inv.created ? new Date(inv.created * 1000).toISOString() : null,
        total: formatAmount(inv.amount_paid, inv.currency),
        currency: inv.currency?.toUpperCase() ?? null,
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch (e) {
      console.error("Failed to load invoices", e);
    }

    return { subscription: sub, invoices };
  });

/** Hosted Stripe billing portal for payment method / invoice management. */
export const getBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env; returnUrl?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { ok: true as const, url: portal.url };
    } catch (e) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { ok: false as const, error: getStripeErrorMessage(e) };
    }
  });

/** Cancel at the end of the paid period — the member keeps access until then. */
export const cancelMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };
    if (sub.status === "canceled") return { ok: false as const, error: "Already canceled." };

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (e) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { ok: false as const, error: getStripeErrorMessage(e) };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    return { ok: true as const };
  });

/** Undo a scheduled cancellation before the period ends. */
export const resumeMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    } catch (e) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { ok: false as const, error: getStripeErrorMessage(e) };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    return { ok: true as const };
  });
