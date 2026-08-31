import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { MembershipButton } from "@/components/MembershipButton";
import { useMe } from "@/hooks/useSession";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  cancelMembership,
  getBillingPortalUrl,
  getBillingSummary,
  resumeMembership,
} from "@/lib/billing.functions";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — The Last Person" },
      {
        name: "description",
        content:
          "Manage your membership, presses and billing for The Last Person: renewal date, invoices, payment method and cancellation.",
      },
      { property: "og:title", content: "Your account — The Last Person" },
      {
        property: "og:description",
        content: "Membership, presses and billing for The Last Person.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border/70 bg-card/40 p-5">
      <h2 className="label-caps text-[10px] text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AccountPage() {
  const { session, profile, ready } = useMe();
  const { subscription, isActive, isPastDue } = useSubscription();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const environment = getStripeEnvironment();

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/auth", replace: true });
  }, [ready, session, navigate]);

  const billing = useQuery({
    queryKey: ["billing", session?.user.id ?? null, environment],
    enabled: !!session && !!subscription,
    queryFn: () => getBillingSummary({ data: { environment } }),
  });

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    try {
      const res = await getBillingPortalUrl({ data: { environment } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  const endsAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const canceling = subscription?.cancel_at_period_end || subscription?.status === "canceled";

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight">Your account</h1>

        <div className="mt-8 space-y-4">
          <Panel title="Player">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-lg">{profile?.username ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{session?.user.email}</p>
              </div>
              {profile && (
                <Link
                  to="/players/$username"
                  params={{ username: profile.username }}
                  className="label-caps text-[10px] text-primary"
                >
                  Public profile
                </Link>
              )}
            </div>
          </Panel>

          <Panel title="Presses">
            <p className="font-mono text-3xl">{profile?.presses_remaining ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Left this month. Resets on the 1st to {profile?.is_member ? "11" : "1"} press
              {profile?.is_member ? "es" : ""}.
            </p>
          </Panel>

          <Panel title="Membership">
            {isPastDue && (
              <p className="mb-3 rounded-sm border border-signal/50 bg-signal/10 px-3 py-2 text-xs text-signal">
                Your last payment failed. Update your payment method to keep your presses.
              </p>
            )}

            {isActive ? (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-lg text-primary">
                    $1 / month · {canceling ? "ending" : "active"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {canceling
                      ? `Access continues until ${endsAt ? endsAt.toLocaleDateString() : "the end of the period"}, then you drop to 1 press a month.`
                      : endsAt
                        ? `Renews on ${endsAt.toLocaleDateString()}.`
                        : "Renews monthly."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void openPortal()}
                    className="rounded-sm border border-border px-4 py-2 label-caps text-[10px] disabled:opacity-50"
                  >
                    Update payment method
                  </button>
                  {canceling ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(() => resumeMembership({ data: { environment } }), "Membership resumed.")
                      }
                      className="rounded-sm bg-primary px-4 py-2 label-caps text-[10px] text-primary-foreground disabled:opacity-50"
                    >
                      Keep my membership
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => cancelMembership({ data: { environment } }),
                          "Canceled. You keep access until the period ends.",
                        )
                      }
                      className="rounded-sm border border-destructive/50 px-4 py-2 label-caps text-[10px] text-destructive disabled:opacity-50"
                    >
                      Cancel membership
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You're on the free plan — 1 press a month. Membership adds 10 more.
                </p>
                <MembershipButton />
              </div>
            )}
          </Panel>

          {(billing.data?.invoices.length ?? 0) > 0 && (
            <Panel title="Invoices">
              <ul className="divide-y divide-border/60">
                {billing.data!.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2 font-mono text-xs">
                    <span className="text-muted-foreground">
                      {inv.at ? new Date(inv.at).toLocaleDateString() : "—"}
                      {inv.number ? ` · ${inv.number}` : ""}
                    </span>
                    <span>
                      {inv.total ?? "—"} {inv.currency ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Payments and receipts are handled securely by Stripe.
              </p>
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}
