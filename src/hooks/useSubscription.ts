import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSession } from "@/hooks/useSession";

export type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_subscription_id: string;
};

const ACTIVE = ["active", "trialing", "past_due"];

export function useSubscription() {
  const { session, ready } = useSession();
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();
  // Several components use this hook at once; each needs its own channel
  // topic, otherwise supabase reuses the subscribed channel and `.on()` throws.
  const instanceId = useId();

  const query = useQuery({
    queryKey: ["subscription", userId],
    enabled: ready && !!userId,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, stripe_subscription_id")
        .eq("user_id", userId!)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionRow | null;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`subs-${userId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["subscription", userId] });
          void qc.invalidateQueries({ queryKey: ["me"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc, instanceId]);

  const sub = query.data ?? null;
  const endsAt = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const isActive =
    !!sub &&
    ((ACTIVE.includes(sub.status) && (!endsAt || endsAt > new Date())) ||
      (sub.status === "canceled" && !!endsAt && endsAt > new Date()));

  return { subscription: sub, isActive, isPastDue: sub?.status === "past_due", loading: query.isLoading };
}
