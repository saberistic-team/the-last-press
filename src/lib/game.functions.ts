import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/);

/** Server clock, used by clients to correct for local clock drift. */
export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({
  now: new Date().toISOString(),
}));

export const pressButton = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("press_button", { _user_id: context.userId });
    if (error) throw new Error(error.message);
    return data as { ok: boolean; error?: string; expires_at?: string; presses_remaining?: number };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("refill_allowance", { _user_id: context.userId });
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return {
      profile: data,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string }) => ({ username: usernameSchema.parse(input.username) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();
    if (existing && existing.id !== context.userId) {
      return { ok: false as const, error: "That username is taken." };
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: context.userId, username: data.username }, { onConflict: "id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const chooseNextDuration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { choice: "double" | "half" | "keep" }) => ({
    choice: z.enum(["double", "half", "keep"]).parse(input.choice),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: season } = await supabaseAdmin
      .from("seasons")
      .select("*")
      .eq("status", "ended")
      .order("season_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!season || season.winner_user_id !== context.userId) {
      return { ok: false as const, error: "Only the winner can set the next season." };
    }
    if (season.next_duration_choice) return { ok: false as const, error: "Already chosen." };

    const { data: nextMs } = await supabaseAdmin.rpc("next_duration_ms", {
      _current: season.duration_ms,
      _choice: data.choice,
    });
    await supabaseAdmin
      .from("seasons")
      .update({ next_duration_choice: data.choice })
      .eq("id", season.id);
    await supabaseAdmin
      .from("seasons")
      .update({ duration_ms: nextMs as number })
      .eq("status", "pending");
    return { ok: true as const, duration_ms: nextMs as number };
  });

/* ------------------------- admin / demo controls ------------------------- */

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.userId);
    const [{ data: seasons }, { count: players }, { count: members }, { data: presses }] =
      await Promise.all([
        db.from("seasons").select("*").order("season_number", { ascending: false }).limit(20),
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("profiles").select("id", { count: "exact", head: true }).eq("is_member", true),
        db.from("presses").select("*").order("pressed_at", { ascending: false }).limit(25),
      ]);
    return { seasons: seasons ?? [], players: players ?? 0, members: members ?? 0, presses: presses ?? [] };
  });

export const adminUpdateSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { seasonId: string; duration_ms?: number; status?: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const patch: { duration_ms?: number; status?: string } = {};
    if (typeof data.duration_ms === "number") {
      patch.duration_ms = Math.min(604800000, Math.max(300000, Math.round(data.duration_ms)));
    }
    if (data.status) patch.status = data.status;
    const { error } = await db.from("seasons").update(patch).eq("id", data.seasonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Demo: move the clock forward so the endgame can be tested instantly. */
export const adminSetRemaining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { seconds: number }) => ({
    seconds: z.number().min(0).max(604800).parse(input.seconds),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: season } = await db.from("seasons").select("id").eq("status", "active").maybeSingle();
    if (!season) return { ok: false as const, error: "No active season." };
    await db
      .from("seasons")
      .update({ timer_expires_at: new Date(Date.now() + data.seconds * 1000).toISOString() })
      .eq("id", season.id);
    return { ok: true as const };
  });

/** Demo: make a simulated player press right now. */
export const adminBotPress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.userId);
    const { data } = await db.rpc("bot_press");
    return data as { ok: boolean; error?: string };
  });

export const adminSettle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.userId);
    const { data } = await db.rpc("settle_seasons");
    return { result: JSON.stringify(data ?? null) };
  });

export const adminSetBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banned: boolean }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("profiles").update({ banned: data.banned }).eq("id", data.userId);
    return { ok: true };
  });

export const adminGrantPresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string; presses: number }) => ({
    username: usernameSchema.parse(input.username),
    presses: z.number().int().min(0).max(100).parse(input.presses),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { error } = await db
      .from("profiles")
      .update({ presses_remaining: data.presses })
      .ilike("username", data.username);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
