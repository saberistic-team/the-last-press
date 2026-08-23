import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/TopNav";
import { useMe } from "@/hooks/useSession";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/check-email")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Confirm your email — The Last Person" },
      {
        name: "description",
        content:
          "Confirm your email address to finish creating your The Last Person account and claim your username.",
      },
      { property: "og:title", content: "Confirm your email — The Last Person" },
      {
        property: "og:description",
        content: "One more step before you can press the button.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckEmail,
});

function CheckEmail() {
  const { email } = Route.useSearch();
  const { session, profile } = useMe();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Confirming in another tab signs this one in too — move them along.
  useEffect(() => {
    if (!session) return;
    void navigate({ to: profile?.username_set ? "/" : "/auth", replace: true });
  }, [session, profile, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCooldown(30);
    toast.success("Sent again. Give it a minute.");
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-md px-4 py-20">
        <div className="animate-rise space-y-6">
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/40 px-3 py-1.5">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="label-caps text-[10px] text-primary">Awaiting confirmation</span>
          </div>

          <h1 className="font-display text-4xl font-bold uppercase tracking-tight">
            Check your email
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-mono text-foreground">{email ?? "your inbox"}</span>. Click it and
            you'll come straight back here to pick your name and join the clock.
          </p>

          <div className="rounded-sm border border-border/70 bg-card/40 p-4">
            <p className="label-caps text-[10px] text-muted-foreground">Nothing arrived?</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Give it a minute, then check spam or promotions. The link expires after 24 hours.
            </p>
            {email && (
              <button
                onClick={() => void resend()}
                disabled={busy || cooldown > 0}
                className="mt-3 rounded-sm border border-border px-4 py-2 label-caps text-[10px] disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : busy ? "Sending…" : "Resend email"}
              </button>
            )}
          </div>

          <div className="flex gap-4 text-[11px]">
            <Link to="/auth" className="label-caps text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
            <Link to="/" className="label-caps text-muted-foreground hover:text-foreground">
              Watch the clock
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
