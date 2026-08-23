import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useSession";
import { isMuted, loadMuted, setMuted } from "@/lib/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Live" },
  { to: "/seasons", label: "Seasons" },
  { to: "/how-it-works", label: "How it works" },
];

export function TopNav() {
  const { session, profile, isAdmin } = useMe();
  const [muted, setLocalMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => setLocalMuted(loadMuted()), []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="label-caps text-sm text-foreground">
          The Last Person
        </Link>
        <div className="hidden gap-5 sm:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="label-caps text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "label-caps text-[11px] text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="label-caps text-[11px] text-signal transition-opacity hover:opacity-80"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const next = !isMuted();
              setMuted(next);
              setLocalMuted(next);
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          {session ? (
            <div className="flex items-center gap-3">
              {profile && (
                <Link
                  to="/players/$username"
                  params={{ username: profile.username }}
                  className="font-mono text-xs text-foreground hover:text-primary"
                >
                  {profile.username}
                </Link>
              )}
              <Link
                to="/account"
                className="label-caps text-[10px] text-muted-foreground hover:text-foreground"
              >
                Account
              </Link>
              <button
                onClick={() => void signOut()}
                className="label-caps text-[10px] text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="label-caps rounded-sm border border-primary/60 px-3 py-1.5 text-[10px] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Join
            </Link>
          )}

          <button
            className="text-muted-foreground sm:hidden"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Menu className="size-4" />
          </button>
        </div>
      </nav>
      {open && (
        <div className="flex flex-col gap-1 border-t border-border/60 px-4 py-3 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="label-caps py-1.5 text-[11px] text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
          {session && (
            <Link to="/account" onClick={() => setOpen(false)} className="label-caps py-1.5 text-[11px] text-muted-foreground">
              Account
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className="label-caps py-1.5 text-[11px] text-signal">
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
