import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/game.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setReady(true);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void qc.invalidateQueries({ queryKey: ["me"] });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return { session, ready };
}

export function useMe() {
  const { session, ready } = useSession();
  const query = useQuery({
    queryKey: ["me", session?.user.id ?? null],
    queryFn: () => getMyProfile(),
    enabled: ready && !!session,
    staleTime: 5000,
  });
  return {
    session,
    ready,
    loading: query.isLoading,
    profile: query.data?.profile ?? null,
    isAdmin: query.data?.isAdmin ?? false,
    refetch: query.refetch,
  };
}
