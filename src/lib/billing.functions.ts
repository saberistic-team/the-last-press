import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaddleEnv } from "@/lib/paddle.server";

type Env = PaddleEnv;

export type Invoice = {
  id: string;
  number: string | null;
  at: string | null;
  total: string | null;
  currency: string | null;
};

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
      const { gatewayFetch } = await import("@/lib/paddle.server");
      const res = await gatewayFetch(
        data.environment,
        `/transactions?subscription_id=${encodeURIComponent(sub.paddle_subscription_id)}&status=completed&per_page=10`,
      );
      const json = (await res.json()) as {
        data?: Array<{
          id: string;
          billed_at?: string;
          created_at?: string;
          invoice_number?: string;
          details?: { totals?: { grand_total?: string; currency_code?: string } };
        }>;
      };
      invoices = (json.data ?? []).map((t) => ({
        id: t.id,
        number: t.invoice_number ?? null,
        at: t.billed_at ?? t.created_at ?? null,
        total: t.details?.totals?.grand_total ?? null,
        currency: t.details?.totals?.currency_code ?? null,
      }));
    } catch (e) {
      console.error("Failed to load invoices", e);
    }

    return { subscription: sub, invoices };
  });

/** Hosted portal for updating the payment method / viewing invoices. */
export const getBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(sub.environment as Env);
    const session = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [
      sub.paddle_subscription_id,
    ]);
    const url =
      session.urls?.subscriptions?.[0]?.updateSubscriptionPaymentMethod ??
      session.urls?.general?.overview;
    if (!url) return { ok: false as const, error: "Could not open the billing portal." };
    return { ok: true as const, url };
  });

/** Cancel at the end of the paid period — the member keeps access until then. */
export const cancelMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };
    if (sub.status === "canceled") return { ok: false as const, error: "Already canceled." };

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(sub.environment as Env);
    try {
      await paddle.subscriptions.cancel(sub.paddle_subscription_id, {
        effectiveFrom: "next_billing_period",
      });
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Cancel failed." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", sub.paddle_subscription_id);

    return { ok: true as const };
  });

/** Undo a scheduled cancellation before the period ends. */
export const resumeMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: Env }) => input)
  .handler(async ({ data, context }) => {
    const sub = await loadSubscription(context.userId, data.environment);
    if (!sub) return { ok: false as const, error: "No membership found." };

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(sub.environment as Env);
    try {
      await paddle.subscriptions.update(sub.paddle_subscription_id, { scheduledChange: null });
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not resume." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", sub.paddle_subscription_id);

    return { ok: true as const };
  });
