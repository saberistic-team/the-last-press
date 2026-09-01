-- lovable-cron-fallback-reviewed: 288 runs/day; season end is genuinely time-based (a countdown expiring with no row change to trigger on). Clients settle instantly while watching; this job is the no-viewer backstop and drives the simulated crowd.
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

CREATE OR REPLACE FUNCTION public.settle_seasons()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.seasons%ROWTYPE; nxt integer;
BEGIN
  SELECT * INTO s FROM public.seasons WHERE status = 'active' FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('settled', false); END IF;
  IF s.timer_expires_at IS NULL OR s.timer_expires_at > now() THEN
    RETURN jsonb_build_object('settled', false);
  END IF;

  UPDATE public.seasons
    SET status = 'ended', ended_at = now(), winner_user_id = s.last_presser_id
    WHERE id = s.id;

  UPDATE public.season_players sp
    SET final_position = 1, status = 'winner'
    WHERE sp.season_id = s.id AND sp.user_id = s.last_presser_id;

  UPDATE public.season_players sp
    SET status = 'eliminated', eliminated_at = now()
    WHERE sp.season_id = s.id AND sp.user_id IS DISTINCT FROM s.last_presser_id;

  SELECT COALESCE(MAX(season_number),0) + 1 INTO nxt FROM public.seasons;
  INSERT INTO public.seasons (season_number, status, duration_ms)
  VALUES (nxt, 'pending', s.duration_ms);

  RETURN jsonb_build_object('settled', true, 'season_id', s.id, 'winner', s.last_presser_id);
END; $function$;

CREATE OR REPLACE FUNCTION public.crowd_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.seasons%ROWTYPE; frac numeric; pressed boolean := false;
BEGIN
  PERFORM public.settle_seasons();
  SELECT * INTO s FROM public.seasons WHERE status = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('pressed', false); END IF;
  frac := GREATEST(0, EXTRACT(EPOCH FROM (s.timer_expires_at - now())) * 1000) / GREATEST(1, s.duration_ms);
  IF frac < 0.02 THEN
    pressed := false;
  ELSIF frac < 0.05 AND random() < 0.5 THEN
    PERFORM public.bot_press(); pressed := true;
  ELSIF frac < 0.25 AND random() < 0.2 THEN
    PERFORM public.bot_press(); pressed := true;
  ELSIF random() < 0.05 THEN
    PERFORM public.bot_press(); pressed := true;
  END IF;
  RETURN jsonb_build_object('pressed', pressed);
END; $function$;

REVOKE ALL ON FUNCTION public.settle_seasons() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crowd_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_seasons() TO service_role;
GRANT EXECUTE ON FUNCTION public.crowd_tick() TO service_role;

SELECT cron.schedule('last-person-crowd-tick', '*/5 * * * *', $$SELECT public.crowd_tick();$$);

SELECT public.settle_seasons();