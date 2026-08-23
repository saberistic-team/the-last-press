import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { claimUsername } from "@/lib/game.functions";
import { useMe } from "@/hooks/useSession";
import { validateUsername } from "@/lib/game";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Join The Last Person — One button, one global timer" },
      {
        name: "description",
        content:
          "Create an account to play The Last Person. Free players get one press a month; $1/month gets you ten more.",
      },
      { property: "og:title", content: "Join The Last Person" },
      {
        property: "og:description",
        content: "One button. One global timer. Don't be the one who blinks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, profile, ready, refetch } = useMe();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const needsUsername = !!session && ready && !profile;

  useEffect(() => {
    if (session && profile) void navigate({ to: "/", replace: true });
  }, [session, profile, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in failed.");
      return;
    }
    if (result.redirected) return;
    await refetch();
  }

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateUsername(username);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    const res = await claimUsername({ data: { username: username.trim() } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await refetch();
    toast.success("You're in.");
    void navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-md px-4 py-16">
        {needsUsername ? (
          <form onSubmit={saveUsername} className="animate-rise space-y-5">
            <div>
              <h1 className="font-display text-4xl font-bold uppercase tracking-tight">Pick your name</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This is how the world sees you when you reset the clock. It cannot be changed later.
              </p>
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="potato57"
              autoFocus
              className="w-full rounded-sm border border-input bg-card px-4 py-3 font-mono text-lg outline-none focus:border-primary"
            />
            <button
              disabled={busy}
              className="w-full rounded-sm bg-primary px-4 py-3 label-caps text-sm text-primary-foreground disabled:opacity-50"
            >
              Claim username
            </button>
          </form>
        ) : (
          <div className="animate-rise space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold uppercase tracking-tight">
                {mode === "signup" ? "Join the game" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Free players get <span className="text-foreground">1 press a month</span>. Membership adds{" "}
                <span className="text-foreground">10 more</span> for $1/month. Watching is always free.
              </p>
            </div>

            <button
              onClick={() => void google()}
              className="w-full rounded-sm border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-foreground/40"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-[10px] label-caps text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-sm border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded-sm border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                disabled={busy}
                className="w-full rounded-sm bg-primary px-4 py-3 label-caps text-sm text-primary-foreground disabled:opacity-50"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signup" ? "Already playing? Sign in" : "New here? Create an account"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
